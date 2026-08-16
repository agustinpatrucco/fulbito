/**
 * Supabase (PostgREST, Storage, Auth) throws plain objects shaped like `{ message,
 * details, hint, code }` — not instances of the built-in `Error`. A bare
 * `e instanceof Error` check misses them, so every failure fell through to a generic
 * fallback and hid the actual reason (a missing column, a failed RLS policy, etc).
 */
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    return e.message
  }
  return fallback
}
