import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/**
 * Null until the Supabase env vars are filled in. The app then runs in "local mode":
 * everything lives in this browser's localStorage. That keeps the whole thing usable
 * (and testable) before a Supabase project exists, and it means a missing env var on
 * Netlify degrades to a working app rather than a white screen.
 */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export const isCloudMode = supabase !== null
