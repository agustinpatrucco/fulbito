import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Player, PlayerDraft } from '../../types'
import { playerStore } from '../../lib/store'

/** Single source of truth for the roster; both screens read from this. */
export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setPlayers(await playerStore.list())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el plantel')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const create = useCallback(async (draft: PlayerDraft) => {
    const player = await playerStore.create(draft)
    setPlayers((prev) => [...prev, player].sort(byName))
    return player
  }, [])

  const update = useCallback(async (id: string, patch: Partial<PlayerDraft>) => {
    const player = await playerStore.update(id, patch)
    setPlayers((prev) => prev.map((p) => (p.id === id ? player : p)).sort(byName))
    return player
  }, [])

  const remove = useCallback(async (id: string) => {
    await playerStore.remove(id)
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  return { players, byId, loading, error, reload, create, update, remove }
}

const byName = (a: Player, b: Player) => a.name.localeCompare(b.name, 'es')
