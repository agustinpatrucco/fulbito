import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Match, MatchDraft, Player, Slot, TeamId } from '../../types'
import { isLocked } from '../../types'
import { DEFAULT_FORMATION, buildSlots, getFormation } from '../../data/formations'
import { matchStore } from '../../lib/matchStore'
import { autoPlace, refit } from '../squad/autoPlace'
import { computePlayerStats } from './stats'

type SlotsByTeam = { A: Slot[]; B: Slot[] }

const EMPTY_SLOTS: SlotsByTeam = { A: [], B: [] }

/**
 * The one source of truth for everything match-related: the fecha you're currently
 * building on the pitch, the full history for the Historial tab, and the win/streak
 * stats derived from it. One hook rather than three so there's a single fetch of
 * matches + lineups behind all of it.
 *
 * "Current" match is whichever fecha has the latest kickoff time — editable on the
 * pitch until that moment passes, then locked and waiting for a result.
 */
export function useMatches(byId: Map<string, Player>) {
  const [matches, setMatches] = useState<Match[]>([])
  const [slotsByMatch, setSlotsByMatch] = useState<Map<string, SlotsByTeam>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const currentMatch = matches[0] ?? null
  const locked = currentMatch ? isLocked(currentMatch) : false
  const slots = (currentMatch && slotsByMatch.get(currentMatch.id)) || EMPTY_SLOTS

  const reload = useCallback(async () => {
    try {
      const list = await matchStore.list()
      const loaded = await matchStore.loadAllSlots(list.map((m) => m.id))
      setMatches(list)
      setSlotsByMatch(loaded)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la fecha')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
    // Catches changes made on another device while this tab was in the background —
    // no full realtime subscription, but enough that switching devices shows what's new.
    const onVisible = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  const assignedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const team of ['A', 'B'] as TeamId[]) {
      for (const slot of slots[team]) if (slot.playerId) ids.add(slot.playerId)
    }
    return ids
  }, [slots])

  const stats = useMemo(
    () =>
      computePlayerStats(
        matches.map((m) => ({ match: m, slots: slotsByMatch.get(m.id) ?? EMPTY_SLOTS })),
      ),
    [matches, slotsByMatch],
  )

  /** Optimistic local update, persisted in the background; a failure surfaces as an error
      and the next reload wins, rather than trying to hand-roll a rollback. */
  const persistSlots = useCallback((matchId: string, team: TeamId, next: Slot[]) => {
    setSlotsByMatch((prev) => {
      const map = new Map(prev)
      const current = map.get(matchId) ?? EMPTY_SLOTS
      map.set(matchId, { ...current, [team]: next })
      return map
    })
    matchStore.saveSlots(matchId, team, next).catch((e) => {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el equipo')
    })
  }, [])

  const tapSlot = useCallback(
    (team: TeamId, index: number) => {
      if (!currentMatch || locked) return
      const next = { A: [...slots.A], B: [...slots.B] }
      const target = { ...next[team][index] }

      if (!selectedId) {
        target.playerId = null
        next[team] = next[team].map((s) => (s.index === index ? target : s))
        persistSlots(currentMatch.id, team, next[team])
        return
      }

      let originTeam: TeamId | null = null
      let originIndex = -1
      for (const t of ['A', 'B'] as TeamId[]) {
        const found = next[t].findIndex((s) => s.playerId === selectedId)
        if (found !== -1) {
          originTeam = t
          originIndex = found
          break
        }
      }

      const displaced = target.playerId
      target.playerId = selectedId
      next[team] = next[team].map((s) => (s.index === index ? target : s))

      if (originTeam !== null) {
        next[originTeam] = next[originTeam].map((s, i) =>
          i === originIndex ? { ...s, playerId: displaced } : s,
        )
      }

      setSelectedId(null)
      persistSlots(currentMatch.id, team, next[team])
      if (originTeam !== null && originTeam !== team) {
        persistSlots(currentMatch.id, originTeam, next[originTeam])
      }
    },
    [currentMatch, locked, slots, selectedId, persistSlots],
  )

  const tapPlayer = useCallback((playerId: string) => {
    setSelectedId((prev) => (prev === playerId ? null : playerId))
  }, [])

  const setFormation = useCallback(
    (team: TeamId, formationId: string) => {
      if (!currentMatch || locked) return
      const formation = getFormation(formationId)
      const { slots: nextSlots } = refit(slots[team], formation, byId)
      matchStore.setFormation(currentMatch.id, team, formationId).catch((e) => {
        setError(e instanceof Error ? e.message : 'No se pudo cambiar la formación')
      })
      setMatches((prev) =>
        prev.map((m) =>
          m.id === currentMatch.id
            ? { ...m, [team === 'A' ? 'formationA' : 'formationB']: formationId }
            : m,
        ),
      )
      persistSlots(currentMatch.id, team, nextSlots)
    },
    [currentMatch, locked, slots, byId, persistSlots],
  )

  const fillTeam = useCallback(
    (team: TeamId, players: Player[]) => {
      if (!currentMatch || locked) return
      const formationId = team === 'A' ? currentMatch.formationA : currentMatch.formationB
      const { slots: nextSlots } = autoPlace(players, getFormation(formationId))
      persistSlots(currentMatch.id, team, nextSlots)
    },
    [currentMatch, locked, persistSlots],
  )

  const clearTeam = useCallback(
    (team: TeamId) => {
      if (!currentMatch || locked) return
      persistSlots(
        currentMatch.id,
        team,
        slots[team].map((s) => ({ ...s, playerId: null })),
      )
      setSelectedId(null)
    },
    [currentMatch, locked, slots, persistSlots],
  )

  const createMatch = useCallback(
    async (draft: MatchDraft) => {
      const formationId = DEFAULT_FORMATION[draft.teamSize]
      const formation = getFormation(formationId)
      const match = await matchStore.create(draft, formationId, formationId)
      const emptySlots = buildSlots(formation)
      await Promise.all([
        matchStore.saveSlots(match.id, 'A', emptySlots),
        matchStore.saveSlots(match.id, 'B', emptySlots),
      ])
      await reload()
      return match
    },
    [reload],
  )

  /** Works on any match, not just the current one — Historial can correct an old score. */
  const setResult = useCallback(async (matchId: string, scoreA: number, scoreB: number) => {
    const updated = await matchStore.setResult(matchId, scoreA, scoreB)
    setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }, [])

  return {
    matches,
    currentMatch,
    locked,
    loading,
    error,
    slots,
    slotsByMatch,
    stats,
    selectedId,
    assignedIds,
    reload,
    tapSlot,
    tapPlayer,
    setFormation,
    fillTeam,
    clearTeam,
    createMatch,
    setResult,
    clearSelection: () => setSelectedId(null),
  }
}
