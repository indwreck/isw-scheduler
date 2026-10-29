// Builds the "Project Status" spreadsheet from the projects list.
import { format, parseISO } from 'date-fns'
import { endAfterWorkingDays, type WorkCalendar } from './workdays'
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  WORK_TYPE_LABELS,
  WORK_TYPE_ORDER,
  type Project,
} from './types'
import { downloadXlsx, type Cell, type RowRule, type SheetSpec } from './xlsx'

/** Row colors by status — same scheme as Chuck's original Project Status sheet. */
const STATUS_FILL: Partial<Record<Project['status'], string>> = {
  in_permitting: 'FFF2CC', // light yellow (was "Utilities/Permits")
  ready_to_start: 'DDEBF7', // light blue
  active: '5B9BD5', // blue (was "In Progress")
  completed: 'C6E0B4', // green
  on_hold: 'F4B183', // orange
  closed: 'D9D9D9', // gray (new in the app)
}

function statusRules(col: number, span?: [number, number]): RowRule[] {
  return PROJECT_STATUS_ORDER.flatMap((s) => {
    const fill = STATUS_FILL[s]
    return fill ? [{ col, equals: PROJECT_STATUS_LABELS[s], fill, span }] : []
  })
}

const STATUS_MEANING: Record<Project['status'], string> = {
  awarded: 'Job is ours but not ready for utilities/permits yet',
  in_permitting: 'Utility disconnects and permits in progress',
  ready_to_start: 'Permits in hand, waiting on a start date or crew',
  active: 'Crew is on site',
  completed: 'Work is done, not yet paid in full',
  on_hold: 'Stopped — waiting on the client or something outside our control',
  closed: 'Complete and paid in full',
}

function toDate(iso: string | null): Date | null {
  return iso ? parseISO(iso) : null
}

export function buildProjectReport(
  projects: Project[],
  permits: Record<number, [number, number]>,
  calendar: WorkCalendar,
): SheetSpec[] {
  const rank = new Map(PROJECT_STATUS_ORDER.map((s, i) => [s, i]))
  const sorted = [...projects].sort((a, b) => {
    const r = (rank.get(a.status) ?? 99) - (rank.get(b.status) ?? 99)
    if (r !== 0) return r
    const da = a.planned_start ?? '9999'
    const db = b.planned_start ?? '9999'
    if (da !== db) return da < db ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const typeLabel = (p: Project) => (p.work_types ?? []).map((w) => WORK_TYPE_LABELS[w]).join(' / ')
  const typeOptions = [
    ...WORK_TYPE_ORDER.map((w) => WORK_TYPE_LABELS[w]),
    ...new Set(sorted.map(typeLabel).filter((t) => t.includes(' / '))),
  ]

  const rows: Cell[][] = sorted.map((p) => {
    const cal =
      p.use_company_calendar || !p.custom_work_days
        ? calendar
        : { ...calendar, workDays: p.custom_work_days }
    const end =
      p.planned_end ??
      (p.planned_start && p.est_duration_days
        ? endAfterWorkingDays(p.planned_start, p.est_duration_days, cal)
        : null)
    const perm = permits[p.id]
    return [
      p.project_number,
      p.name,
      p.address,
      typeLabel(p),
      PROJECT_STATUS_LABELS[p.status],
      toDate(p.planned_start),
      p.planned_start ? (p.start_type === 'confirmed' ? 'Hard Start Date' : 'Tentative') : '',
      toDate(end),
      p.est_duration_days ?? null,
      perm && perm[1] > 0 ? `${perm[0]} of ${perm[1]}` : '',
      p.notes,
    ]
  })

  const tracker: SheetSpec = {
    name: 'Project Tracker',
    headers: [
      'Project Number',
      'Project Name',
      'Address',
      'Type',
      'Status',
      'Start Date',
      'Date Type',
      'End Date',
      'Work Days',
      'Permits',
      'Notes',
    ],
    rows,
    widths: [15, 44, 30, 24, 15, 12, 15, 12, 10, 10, 60],
    wrap: [10],
    // Status is column E (index 4). Rules + dropdowns reach 300 rows past the
    // data so rows added by hand in Excel behave the same way.
    rowRules: statusRules(4),
    dropdowns: [
      { col: 3, options: typeOptions },
      { col: 4, options: PROJECT_STATUS_ORDER.map((s) => PROJECT_STATUS_LABELS[s]) },
      { col: 6, options: ['Hard Start Date', 'Tentative'] },
    ],
    extraRows: 300,
  }

  const key: SheetSpec = {
    name: 'Notes',
    headers: ['Status', 'Meaning'],
    rows: PROJECT_STATUS_ORDER.map((s) => [PROJECT_STATUS_LABELS[s], STATUS_MEANING[s]]),
    widths: [18, 70],
    rowRules: statusRules(0, [0, 0]),
  }

  return [tracker, key]
}

export function downloadProjectReport(
  projects: Project[],
  permits: Record<number, [number, number]>,
  calendar: WorkCalendar,
) {
  const stamp = format(new Date(), 'yyyy-MM-dd')
  downloadXlsx(`ISW Project Status ${stamp}.xlsx`, buildProjectReport(projects, permits, calendar))
}
