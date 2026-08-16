import { useEffect, useState } from 'react'
import { supabase, isCloudMode, FULBITO_EMAIL } from './supabase'

/**
 * The "single shared password" gate.
 *
 * There is no hand-rolled password check here: one Supabase Auth user exists, the app
 * hardcodes its email, and the user supplies only the password. Supabase issues a real
 * JWT and Row Level Security does the actual enforcement server-side — reads are open,
 * writes require that JWT. Hiding buttons in the client would not be security; this is.
 *
 * In local mode there is no server and nothing to protect, so editing is always on.
 */
export function useAuth() {
  const [canEdit, setCanEdit] = useState(!isCloudMode)
  const [ready, setReady] = useState(!isCloudMode)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setCanEdit(Boolean(data.session))
      setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCanEdit(Boolean(session))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(password: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: null }
    const { error } = await supabase.auth.signInWithPassword({
      email: FULBITO_EMAIL,
      password,
    })
    // Supabase returns the same error for bad password and unknown user; either way the
    // only actionable message for a single-account app is "wrong password".
    return { error: error ? 'Contraseña incorrecta' : null }
  }

  async function signOut() {
    await supabase?.auth.signOut()
  }

  return { canEdit, ready, signIn, signOut }
}
