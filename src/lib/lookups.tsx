import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from './supabase'
import type { CompanySettings, Holiday, LookupItem } from './types'
import type { WorkCalendar } from './workdays'

/**
 * Small, rarely-changing reference data every page needs:
 * company settings, holidays, equipment categories, personnel roles.
 * Loaded once after login; call refresh() after editing them in Settings.
 */
interface Lookups {
  loaded: boolean
  settings: CompanySettings | null
  holidays: Holiday[]
  categories: LookupItem[]
  roles: LookupItem[]
  companyCalendar: WorkCalendar
  refresh: () => Promise<void>
}

const Ctx = createContext<Lookups | null>(null)

export function LookupsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [categories, setCategories] = useState<LookupItem[]>([])
  const [roles, setRoles] = useState<LookupItem[]>([])

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoaded(true)
      return
    }
    const [s, h, c, r] = await Promise.all([
      supabase.from('company_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('holidays').select('*').order('holiday_date'),
      supabase.from('equipment_categories').select('*').order('sort_order').order('name'),
      supabase.from('personnel_roles').select('*').order('sort_order').order('name'),
    ])
    setSettings((s.data as CompanySettings) ?? null)
    setHolidays((h.data as Holiday[]) ?? [])
    setCategories((c.data as LookupItem[]) ?? [])
    setRoles((r.data as LookupItem[]) ?? [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const companyCalendar: WorkCalendar = {
    workDays: settings?.work_days ?? [1, 2, 3, 4, 5],
    holidays: new Set(holidays.map((h) => h.holiday_date)),
  }

  return (
    <Ctx.Provider
      value={{ loaded, settings, holidays, categories, roles, companyCalendar, refresh }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useLookups(): Lookups {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLookups must be used inside <LookupsProvider>')
  return ctx
}
