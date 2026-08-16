import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Player, Slot, Squad, TeamId, TeamSize } from '../../types'
import { DEFAULT_FORMATION, buildSlots, getFormation } from '../../data/formations'
import { autoPlace, refit } from './autoPlace'

const STORAGE_KEY = 'fulbito.squads.v1'

type Saved = { size: TeamSize; A: Squad; B: Squad }

function emptySquad(size: TeamSize): Squad {
  const formationId = DEFAULT_FORMATION[size]
  return { formationId, slots: buildSlots(getFormation(formationId)) }
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Saved
  } catch {
    // Ignore and start fresh — a broken lineup is not worth a crash.
  }
  return { size: 6, A: emptySquad(6), B: emptySquad(6) }
}

/**
 * The in-progress lineup. Kept in localStorage rather than the database: it's scratch
 * state for tonight's match, and it should survive a refresh mid-selection without
 * needing a save button.
 */
export function useSquad(byId: Map<string, Player>) {
  const [state, setState] = useState<Saved>(load)
  /** The card waiting to be placed. Tap a card, then tap a slot. */
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const assignedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const team of ['A', 'B'] as TeamId[]) {
      for (const slot of state[team].slots) {
        if (slot.playerId) ids.add(slot.playerId)
      }
    }
    return ids
  }, [state])

  /** Where a given player currently is, if anywhere. */
  const findSlot = useCallback(
    (playerId: string): { team: TeamId; index: number } | null => {
      for (const team of ['A', 'B'] as TeamId[]) {
        const slot = state[team].slots.find((s) => s.playerId === playerId)
        if (slot) return { team, index: slot.index }
      }
      return null
    },
    [state],
  )

  const setSlots = useCallback((team: TeamId, slots: Slot[]) => {
    setState((prev) => ({ ...prev, [team]: { ...prev[team], slots } }))
  }, [])

  /**
   * Tapping a slot resolves the pending selection. If the selected player is already on
   * the pitch the two positions swap, so re-arranging never means clearing a slot first.
   */
  const tapSlot = useCallback(
    (team: TeamId, index: number) => {
      setState((prev) => {
        const next = structuredClone(prev)
        const target = next[team].slots[index]

        if (!selectedId) {
          // No pending card: tapping an occupied slot benches whoever is in it.
          target.playerId = null
          return next
        }

        const origin = (['A', 'B'] as TeamId[])
          .map((t) => ({ t, slot: next[t].slots.find((s) => s.playerId === selectedId) }))
          .find((x) => x.slot)

        const displaced = target.playerId
        target.playerId = selectedId
        if (origin?.slot) origin.slot.playerId = displaced
        return next
      })
      setSelectedId(null)
    },
    [selectedId],
  )

  /** Tapping a card selects it, or deselects if it was already selected. */
  const tapPlayer = useCallback((playerId: string) => {
    setSelectedId((prev) => (prev === playerId ? null : playerId))
  }, [])

  const setSize = useCallback(
    (size: TeamSize) => {
      setState((prev) => {
        const next: Saved = { ...prev, size }
        for (const team of ['A', 'B'] as TeamId[]) {
          const formationId = DEFAULT_FORMATION[size]
          const formation = getFormation(formationId)
          next[team] = { formationId, slots: refit(prev[team].slots, formation, byId).slots }
        }
        return next
      })
    },
    [byId],
  )

  const setFormation = useCallback(
    (team: TeamId, formationId: string) => {
      setState((prev) => {
        const formation = getFormation(formationId)
        return {
          ...prev,
          [team]: { formationId, slots: refit(prev[team].slots, formation, byId).slots },
        }
      })
    },
    [byId],
  )

  /** Used by the importer: drop a whole list of players into a team at once. */
  const fillTeam = useCallback(
    (team: TeamId, players: Player[]) => {
      setState((prev) => {
        const formation = getFormation(prev[team].formationId)
        return { ...prev, [team]: { ...prev[team], slots: autoPlace(players, formation).slots } }
      })
    },
    [],
  )

  const clearTeam = useCallback((team: TeamId) => {
    setState((prev) => ({
      ...prev,
      [team]: { ...prev[team], slots: prev[team].slots.map((s) => ({ ...s, playerId: null })) },
    }))
    setSelectedId(null)
  }, [])

  return {
    size: state.size,
    squads: { A: state.A, B: state.B },
    selectedId,
    assignedIds,
    findSlot,
    setSlots,
    tapSlot,
    tapPlayer,
    setSize,
    setFormation,
    fillTeam,
    clearTeam,
    clearSelection: () => setSelectedId(null),
  }
}
