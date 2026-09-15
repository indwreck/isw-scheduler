import { addDays, format, parseISO } from 'date-fns'

export interface WorkCalendar {
  workDays: number[] // 0=Sun … 6=Sat
  holidays: Set<string> // 'yyyy-MM-dd'
}

export function isWorkingDay(d: Date, cal: WorkCalendar): boolean {
  if (!cal.workDays.includes(d.getDay())) return false
  return !cal.holidays.has(format(d, 'yyyy-MM-dd'))
}

/**
 * Returns the date on which the Nth working day (inclusive of the start
 * date if it is a working day) falls. e.g. start Mon, 5 working days,
 * Mon–Fri calendar → Fri of that same week.
 */
export function endAfterWorkingDays(
  startIso: string,
  workingDays: number,
  cal: WorkCalendar,
): string | null {
  if (!startIso || workingDays <= 0 || cal.workDays.length === 0) return null
  let d = parseISO(startIso)
  let remaining = workingDays
  // guard against runaway loops on impossible calendars
  for (let i = 0; i < 3660; i++) {
    if (isWorkingDay(d, cal)) {
      remaining--
      if (remaining === 0) return format(d, 'yyyy-MM-dd')
    }
    d = addDays(d, 1)
  }
  return null
}

/** Count working days between two ISO dates, inclusive. */
export function countWorkingDays(
  startIso: string,
  endIso: string,
  cal: WorkCalendar,
): number {
  if (!startIso || !endIso) return 0
  let d = parseISO(startIso)
  const end = parseISO(endIso)
  let n = 0
  while (d <= end) {
    if (isWorkingDay(d, cal)) n++
    d = addDays(d, 1)
  }
  return n
}
