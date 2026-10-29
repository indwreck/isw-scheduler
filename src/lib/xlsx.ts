// Minimal .xlsx writer — enough for a flat report sheet (bold header row,
// column widths, frozen header, text/number/date cells, dropdown lists and
// "color the row when column X says Y" conditional formatting). Built on
// fflate so the app doesn't carry a full spreadsheet library.
import { strToU8, zipSync } from 'fflate'

export type Cell = string | number | Date | null | undefined

export interface SheetSpec {
  name: string
  headers: string[]
  rows: Cell[][]
  /** column widths in characters; defaults to a width based on content */
  widths?: number[]
  /** zero-based column indexes whose cells wrap text (long notes) */
  wrap?: number[]
  /** dropdown lists (Excel data validation) on a column, for the data rows */
  dropdowns?: { col: number; options: string[] }[]
  /** Conditional formatting: when the cell in `col` equals `equals`, color the
   *  whole row (or the given column span). Rules live in the file, so the
   *  colors follow edits made in Excel. Colors are RRGGBB. */
  rowRules?: RowRule[]
  /** how many blank rows below the data the dropdowns/rules should also cover */
  extraRows?: number
}

export interface RowRule {
  col: number
  equals: string
  fill: string
  fontColor?: string
  bold?: boolean
  /** zero-based [first, last] column span; defaults to the whole row */
  span?: [number, number]
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function colRef(i: number) {
  let s = ''
  let n = i
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

/** Excel serial date (days since 1899-12-30), date-only. */
function excelDate(d: Date) {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round(utc / 86400000) + 25569
}

function cellXml(ref: string, v: Cell, style: number) {
  if (v === null || v === undefined || v === '') return style ? `<c r="${ref}" s="${style}"/>` : ''
  if (v instanceof Date) return `<c r="${ref}" s="2"><v>${excelDate(v)}</v></c>`
  if (typeof v === 'number') return `<c r="${ref}" s="${style}"><v>${v}</v></c>`
  // inline string; strip characters Excel rejects
  const text = String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${esc(text)}</t></is></c>`
}

function sheetXml(spec: SheetSpec, dxfBase: number) {
  const widths =
    spec.widths ??
    spec.headers.map((h, c) => {
      let w = h.length
      for (const r of spec.rows) {
        const v = r[c]
        const len = v instanceof Date ? 12 : v == null ? 0 : String(v).length
        if (len > w) w = len
      }
      return Math.min(Math.max(w + 2, 8), 60)
    })
  const cols = widths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('')
  const head =
    `<row r="1">` +
    spec.headers.map((h, c) => cellXml(`${colRef(c)}1`, h, 1)).join('') +
    `</row>`
  const body = spec.rows
    .map(
      (r, i) =>
        `<row r="${i + 2}">` +
        r.map((v, c) => cellXml(`${colRef(c)}${i + 2}`, v, spec.wrap?.includes(c) ? 3 : 0)).join('') +
        `</row>`,
    )
    .join('')
  const lastColIdx = Math.max(spec.headers.length - 1, 0)
  const lastCol = colRef(lastColIdx)
  const lastRow = spec.rows.length + 1
  const reach = lastRow + (spec.extraRows ?? 0)

  const cf = (spec.rowRules ?? [])
    .map((rule, i) => {
      const [a, b] = rule.span ?? [0, lastColIdx]
      const ref = `${colRef(a)}2:${colRef(b)}${reach}`
      const target = `$${colRef(rule.col)}2`
      return (
        `<conditionalFormatting sqref="${ref}">` +
        `<cfRule type="expression" dxfId="${dxfBase + i}" priority="${i + 1}" stopIfTrue="1">` +
        `<formula>${target}=&quot;${esc(rule.equals)}&quot;</formula>` +
        `</cfRule></conditionalFormatting>`
      )
    })
    .join('')

  const dv =
    spec.dropdowns && spec.dropdowns.length
      ? `<dataValidations count="${spec.dropdowns.length}">` +
        spec.dropdowns
          .map((d) => {
            const list = d.options.join(',').replace(/"/g, '""')
            return (
              `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${colRef(d.col)}2:${colRef(d.col)}${reach}">` +
              `<formula1>&quot;${esc(list)}&quot;</formula1></dataValidation>`
            )
          })
          .join('') +
        `</dataValidations>`
      : ''

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${cols}</cols>` +
    `<sheetData>${head}${body}</sheetData>` +
    `<autoFilter ref="A1:${lastCol}${lastRow}"/>` +
    cf +
    dv +
    `</worksheet>`
  )
}

function dxfXml(rule: RowRule) {
  const font =
    rule.fontColor || rule.bold
      ? `<font>${rule.bold ? '<b/>' : ''}${rule.fontColor ? `<color rgb="FF${rule.fontColor}"/>` : ''}</font>`
      : ''
  // differential fills use bgColor for the solid color
  return `<dxf>${font}<fill><patternFill patternType="solid"><bgColor rgb="FF${rule.fill}"/></patternFill></fill></dxf>`
}

const stylesXml = (dxfs: string[]) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="1"><numFmt numFmtId="164" formatCode="m/d/yyyy"/></numFmts>` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="4">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `<dxfs count="${dxfs.length}">${dxfs.join('')}</dxfs>` +
  `</styleSheet>`

export function buildXlsx(sheets: SheetSpec[]): Uint8Array {
  const files: Record<string, Uint8Array> = {}
  files['[Content_Types].xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      sheets
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        )
        .join('') +
      `</Types>`,
  )
  files['_rels/.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`,
  )
  files['xl/workbook.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets>` +
      sheets
        .map((s, i) => `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('') +
      `</sheets></workbook>`,
  )
  files['xl/_rels/workbook.xml.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
        )
        .join('') +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `</Relationships>`,
  )
  const dxfs: string[] = []
  sheets.forEach((s, i) => {
    const base = dxfs.length
    for (const rule of s.rowRules ?? []) dxfs.push(dxfXml(rule))
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s, base))
  })
  files['xl/styles.xml'] = strToU8(stylesXml(dxfs))
  return zipSync(files, { level: 6 })
}

/** Trigger a browser download of the workbook. */
export function downloadXlsx(filename: string, sheets: SheetSpec[]) {
  const bytes = buildXlsx(sheets)
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
