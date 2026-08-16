import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const FULBITO_EMAIL =
  import.meta.env.VITE_FULBITO_EMAIL?.trim() || 'fulbito@fulbito.local'

/**
 * Null until the Supabase env vars are filled in. The app then runs in "local mode":
 * everything lives in this browser's localStorage. That keeps the whole thing usable
 * (and testable) before a Supabase project exists, and it means a missing env var on
 * Netlify degrades to a working app rather than a white screen.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null

export const isCloudMode = supabase !== null
