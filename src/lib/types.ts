// Database row types — mirror supabase/migrations/0001_init.sql

export type UserRole = 'admin' | 'manager'

export type ProjectStatus =
  | 'awarded'
  | 'in_permitting'
  | 'ready_to_start'
  | 'active'
  | 'on_hold'
  | 'closed'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  awarded: 'Awarded',
  in_permitting: 'In Permitting',
  ready_to_start: 'Ready to Start',
  active: 'Active',
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
  'on_hold',
  'closed',
]

/** Statuses shown by default on lists and the schedule (spec §3.1). */
export const DEFAULT_VISIBLE_STATUSES: ProjectStatus[] = [
  'awarded',
  'in_permitting',
  'ready_to_start',
  'active',
]
