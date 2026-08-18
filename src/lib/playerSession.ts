import { useCallback, useEffect, useState } from 'react'
import type { Player } from '../types'

const STORAGE_KEY = 'fulbito.sessionPlayerId'

/**
 * "Log in" as an existing player — no password, just pick yourself from Plantel. Lets a
 * friend edit their own card, create fechas, and manage squads/results without knowing
 * the admin password. Persisted per device, same as the admin session.
 */
export function usePlayerSession(players: Player[]) {
  const [playerId, setPlayerId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )

  // Drop a stale session if the selected player was deleted from the roster.
  useEffect(() => {
    if (playerId && players.length > 0 && !players.some((p) => p.id === playerId)) {
      setPlayerId(null)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [playerId, players])

  const selectPlayer = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setPlayerId(id)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setPlayerId(null)
  }, [])

  const player = players.find((p) => p.id === playerId) ?? null

  return { player, selectPlayer, clearSession }
}
