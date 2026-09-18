// Database row types — mirror supabase/migrations/0001_init.sql

export type UserRole = 'admin' | 'manager'

export type ProjectStatus =
  | 'awarded'
  | 'in_permitting'
  | 'ready_to_start'
  | 'active'
  | 'completed'
  | 'on_hold'
  | 'closed'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  awarded: 'Awarded',
  in_permitting: 'In Permitting',
  ready_to_start: 'Ready to Start',
  active: 'Active',
  completed: 'Completed',
  on_hold: 'On Hold',
  closed: 'Closed',
}

export type StartType = 'tentative' | 'confirmed'

export type EntryType =
  | 'time_off'
  | 'no_show'
  | 'late'
  | 'write_up'
  | 'positive'
  | 'general'

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  time_off: 'Time Off',
  no_show: 'No-Show',
  late: 'Late',
  write_up: 'Write-Up / Issue',
  positive: 'Positive Note',
  general: 'General Note',
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface CompanySettings {
  id: 1
  work_days: number[] // 0=Sun … 6=Sat
  default_start_time: string // "07:00:00"
  default_end_time: string
  updated_at: string
}

export interface Holiday {
  id: number
  holiday_date: string // YYYY-MM-DD
  name: string
}

export interface LookupItem {
  id: number
  name: string
  sort_order: number
  is_active: boolean
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface Project {
  id: number
  name: string
  address: string
  status: ProjectStatus
  start_type: StartType
  planned_start: string | null
  planned_end: string | null
  est_duration_days: number | null
  use_company_calendar: boolean
  custom_work_days: number[] | null
  custom_start_time: string | null
  custom_end_time: string | null
  work_types: WorkType[]
  notes: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProjectContact {
  id: number
  project_id: number
  name: string
  company: string
  role: string
  phone: string
  email: string
  notes: string
}

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  'awarded',
  'in_permitting',
  'ready_to_start',
  'active',
  'completed',
  'on_hold',
  'closed',
]

/** Statuses the Schedule shows by default — jobs that still need crews/equipment. */
export const SCHEDULE_VISIBLE_STATUSES: ProjectStatus[] = [
  'awarded',
  'in_permitting',
  'ready_to_start',
  'active',
]

/** Statuses hidden on the Projects list unless "Show On Hold & Closed" is ticked.
 *  Completed (work done, not yet paid) stays visible so it isn't forgotten. */
export const LIST_HIDDEN_STATUSES: ProjectStatus[] = ['on_hold', 'closed']

// ---- Work types & permits (migration 0002) ----

export type WorkType = 'total' | 'selective' | 'interior' | 'site'

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  total: 'Total demo',
  selective: 'Selective demo',
  interior: 'Interior demo',
  site: 'Site work',
}
export const WORK_TYPE_ORDER: WorkType[] = ['total', 'selective', 'interior', 'site']

export type PermitStatus = 'not_started' | 'requested' | 'complete' | 'not_required'

export const PERMIT_STATUS_LABELS: Record<PermitStatus, string> = {
  not_started: 'Not started',
  requested: 'Requested',
  complete: 'Complete',
  not_required: 'Not required',
}

export interface ProjectPermit {
  id: number
  project_id: number
  item: string
  status: PermitStatus
  status_date: string | null
  note: string
  sort_order: number
  created_at: string
  updated_at: string
}

/** Standard checklist added automatically when a project includes Total demo. */
export const TOTAL_DEMO_PERMIT_ITEMS = [
  'Water disconnect',
  'Fire protection line',
  'Gas disconnect',
  'Electric disconnect',
  'Demolition permit',
]

export interface InvitedUser {
  id: number
  email: string
  role: UserRole
  invited_by: string | null
  created_at: string
  accepted_at: string | null
}
