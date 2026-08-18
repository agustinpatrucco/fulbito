import { useCallback, useEffect, useState } from 'react'
import type { Player } from '../types'

const storageKey = (groupCode: string) => `fulbito.session.${groupCode}.playerId`

/**
 * "Log in" as an existing player — no password, just pick yourself from Plantel. Lets a
 * friend edit their own card, create fechas, and manage squads/results. Persisted per
 * device, scoped to one Grupo — picking a player in one group doesn't carry into
 * another.
 */
export function usePlayerSession(groupCode: string, players: Player[]) {
  const key = storageKey(groupCode)
  const [playerId, setPlayerId] = useState<string | null>(() => localStorage.getItem(key))

  // A different group's session id shouldn't leak in if this hook re-mounts with a new
  // groupCode — re-read from that group's own key.
  useEffect(() => {
    setPlayerId(localStorage.getItem(key))
  }, [key])

  // Drop a stale session if the selected player was deleted from the roster.
  useEffect(() => {
    if (playerId && players.length > 0 && !players.some((p) => p.id === playerId)) {
      setPlayerId(null)
      localStorage.removeItem(key)
    }
  }, [playerId, players, key])

  const selectPlayer = useCallback(
    (id: string) => {
      localStorage.setItem(key, id)
      setPlayerId(id)
    },
    [key],
  )

  const clearSession = useCallback(() => {
    localStorage.removeItem(key)
    setPlayerId(null)
  }, [key])

  const player = players.find((p) => p.id === playerId) ?? null

  return { player, selectPlayer, clearSession }
}
