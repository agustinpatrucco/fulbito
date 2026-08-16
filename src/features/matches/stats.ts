import type { Cancha, Match, Slot, TeamId } from '../../types'
import { hasResult, winnerOf } from '../../types'

export type PlayerStats = {
  wins: number
  winsByCancha: Record<Cancha, number>
  /** Consecutive wins counting back from the player's most recent scored match. A draw
      or a loss resets it to 0 — only an unbroken run of wins counts. */
  streak: number
}

/** Below this, the UI shows nothing — a streak of 1 isn't a streak yet. */
export const MIN_STREAK_TO_SHOW = 2

export type MatchWithSlots = { match: Match; slots: { A: Slot[]; B: Slot[] } }

type Outcome = 'win' | 'loss' | 'draw'

function emptyStats(): PlayerStats {
  return { wins: 0, winsByCancha: { Quintana: 0, Complejo: 0 }, streak: 0 }
}

/**
 * Builds a win/loss/draw record for every player from every scored fecha, then reduces
 * that into totals and a current streak. Matches without both scores loaded are ignored
 * entirely — they haven't happened yet, as far as the record is concerned.
 */
export function computePlayerStats(entries: MatchWithSlots[]): Map<string, PlayerStats> {
  const played = entries
    .filter((e) => hasResult(e.match))
    .sort((a, b) => new Date(a.match.scheduledAt).getTime() - new Date(b.match.scheduledAt).getTime())

  // playerId -> chronological outcomes, each tagged with where it happened.
  const history = new Map<string, { outcome: Outcome; cancha: Cancha }[]>()

  const record = (playerId: string, outcome: Outcome, cancha: Cancha) => {
    const list = history.get(playerId) ?? []
    list.push({ outcome, cancha })
    history.set(playerId, list)
  }

  for (const { match, slots } of played) {
    const winner = winnerOf(match)
    const outcomeFor = (team: TeamId): Outcome =>
      winner === 'draw' ? 'draw' : winner === team ? 'win' : 'loss'

    for (const team of ['A', 'B'] as TeamId[]) {
      const outcome = outcomeFor(team)
      for (const slot of slots[team]) {
        if (slot.playerId) record(slot.playerId, outcome, match.cancha)
      }
    }
  }

  const stats = new Map<string, PlayerStats>()
  for (const [playerId, outcomes] of history) {
    const s = emptyStats()
    for (const { outcome, cancha } of outcomes) {
      if (outcome === 'win') {
        s.wins++
        s.winsByCancha[cancha]++
      }
    }
    for (let i = outcomes.length - 1; i >= 0; i--) {
      if (outcomes[i].outcome !== 'win') break
      s.streak++
    }
    stats.set(playerId, s)
  }
  return stats
}

export function statsFor(stats: Map<string, PlayerStats>, playerId: string): PlayerStats {
  return stats.get(playerId) ?? emptyStats()
}
