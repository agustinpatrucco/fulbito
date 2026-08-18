import { useCallback, useEffect, useState } from 'react'
import { supabase, isCloudMode } from './supabase'
import type { Group } from '../types'

type Status = 'landing' | 'loading' | 'not-found' | 'ready'

const CODE_RE = /^[a-z0-9]{6}$/

function codeFromPath(): string | null {
  const segment = window.location.pathname.slice(1).split('/')[0]?.toLowerCase() ?? ''
  return CODE_RE.test(segment) ? segment : null
}

/**
 * Resolves which Grupo this device is looking at, from the URL's first path segment.
 * No code → `landing` (show create/join). A code that doesn't exist → `not-found`.
 * Otherwise `ready` with the resolved `{id, code}` — nothing else in the app mounts
 * until then, so every other hook can assume a real group id.
 *
 * Local mode (no Supabase configured) simulates this entirely client-side: any 6-char
 * code "resolves", just enough to exercise the same UI flow without a real backend.
 */
export function useGroup() {
  const [group, setGroup] = useState<Group | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null)

  const resolve = useCallback(async (code: string, updateUrl: boolean) => {
    setStatus('loading')
    setNotFoundCode(null)

    let found: Group | null = null
    if (!isCloudMode) {
      found = { id: code, code }
    } else {
      const { data, error } = await supabase!.rpc('get_group_by_code', { p_code: code })
      if (!error && data && data.length > 0) found = data[0] as Group
    }

    if (!found) {
      setGroup(null)
      setNotFoundCode(code)
      setStatus('not-found')
      return
    }
    if (updateUrl) history.pushState(null, '', `/${found.code}`)
    setGroup(found)
    setStatus('ready')
  }, [])

  useEffect(() => {
    const code = codeFromPath()
    if (code) resolve(code, false)
    else setStatus('landing')
    // Intentionally only on mount — in-app navigation goes through joinByCode/
    // createGroup below, which call resolve() themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createGroup = useCallback(async () => {
    setStatus('loading')
    if (!isCloudMode) {
      const alphabet = '23456789abcdefghjkmnpqrstuvwxyz'
      const code = Array.from({ length: 6 }, () =>
        alphabet[Math.floor(Math.random() * alphabet.length)],
      ).join('')
      history.pushState(null, '', `/${code}`)
      setGroup({ id: code, code })
      setStatus('ready')
      return
    }
    const { data, error } = await supabase!.rpc('create_group')
    if (error || !data || data.length === 0) {
      setStatus('landing')
      throw new Error('No se pudo crear el grupo')
    }
    const created = data[0] as Group
    history.pushState(null, '', `/${created.code}`)
    setGroup(created)
    setStatus('ready')
  }, [])

  const joinByCode = useCallback(
    async (code: string) => {
      const normalized = code.trim().toLowerCase()
      if (!CODE_RE.test(normalized)) {
        setNotFoundCode(normalized)
        setStatus('not-found')
        return
      }
      await resolve(normalized, true)
    },
    [resolve],
  )

  return { group, status, notFoundCode, createGroup, joinByCode }
}
