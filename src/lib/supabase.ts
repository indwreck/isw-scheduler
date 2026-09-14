import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True once the app has been pointed at a real Supabase project. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Shared Supabase client. When the environment variables are missing
 * (e.g. before Chuck's project is connected) this is null and the UI
 * shows a "not connected" notice instead of crashing.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null
