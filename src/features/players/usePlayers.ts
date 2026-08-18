import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Player, PlayerDraft } from '../../types'
import { playerStore } from '../../lib/store'
import { errorMessage } from '../../lib/errors'

/** Single source of truth for one Grupo's roster; every screen reads from this. */
export function usePlayers(groupId: string) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setPlayers(await playerStore.list(groupId))
      setError(null)
    } catch (e) {
      setError(errorMessage(e, 'No se pudo cargar el plantel'))
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    reload()
  }, [reload])

  /** isAdmin defaults to "is this the first player in the group" — the creator of a
      fresh Grupo becomes its admin the moment they create their own card. */
  const create = useCallback(
    async (draft: PlayerDraft, isAdmin = players.length === 0) => {
      const player = await playerStore.create(groupId, draft, isAdmin)
      setPlayers((prev) => [...prev, player].sort(byName))
      return player
    },
    [groupId, players.length],
  )

  const update = useCallback(
    async (id: string, patch: Partial<PlayerDraft>) => {
      const player = await playerStore.update(groupId, id, patch)
      setPlayers((prev) => prev.map((p) => (p.id === id ? player : p)).sort(byName))
      return player
    },
    [groupId],
  )

  const remove = useCallback(
    async (id: string) => {
      await playerStore.remove(groupId, id)
      setPlayers((prev) => prev.filter((p) => p.id !== id))
    },
    [groupId],
  )

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  return { players, byId, loading, error, reload, create, update, remove }
}

const byName = (a: Player, b: Player) => a.name.localeCompare(b.name, 'es')
