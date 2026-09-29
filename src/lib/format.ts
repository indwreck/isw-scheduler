import { differenceInYears, differenceInMonths, parseISO } from 'date-fns'

/** Formats US phone input as 123-456-7890 while typing. Keeps a leading 1 out. */
export function formatPhone(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1)
  d = d.slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
}

export function ageFrom(birthIso: string | null | undefined): number | null {
  if (!birthIso) return null
  return differenceInYears(new Date(), parseISO(birthIso))
}

/** "6 yrs", "8 mos", "2 wks" */
export function tenureFrom(hireIso: string | null | undefined): string | null {
  if (!hireIso) return null
  const d = parseISO(hireIso)
  const years = differenceInYears(new Date(), d)
  if (years >= 1) return `${years} yr${years === 1 ? '' : 's'}`
  const months = differenceInMonths(new Date(), d)
  if (months >= 1) return `${months} mo${months === 1 ? '' : 's'}`
  return 'new'
}
