import type { Cancha, Match, MvpVote, Slot, TeamId } from '../../types'
import { hasResult, winnerOf } from '../../types'

export type PlayerStats = {
  wins: number
  winsByCancha: Record<Cancha, number>
  /** Consecutive wins counting back from the player's most recent scored match. A draw
      or a loss resets it to 0 — only an unbroken run of wins counts. Only used to power
      the 🔥 badge on player cards — Historial's table shows MVP count instead. */
  streak: number
  /** How many matches this player has won (or tied for) MVP in, across all history. */
  mvpCount: number
}

/** Below this, the UI shows nothing — a streak of 1 isn't a streak yet. */
export const MIN_STREAK_TO_SHOW = 2

export type MatchWithSlots = { match: Match; slots: { A: Slot[]; B: Slot[] } }

type Outcome = 'win' | 'loss' | 'draw'

function emptyStats(): PlayerStats {
  return { wins: 0, winsByCancha: { Quintana: 0, Complejo: 0 }, streak: 0, mvpCount: 0 }
}

/** Whoever got the most votes wins MVP for that match — every player tied for the top
    count wins it, not just one. */
function mvpWinners(votes: MvpVote[]): string[] {
  if (votes.length === 0) return []
  const counts = new Map<string, number>()
  for (const v of votes) counts.set(v.votedPlayerId, (counts.get(v.votedPlayerId) ?? 0) + 1)
  const max = Math.max(...counts.values())
  return [...counts.entries()].filter(([, count]) => count === max).map(([playerId]) => playerId)
}

/**
 * Builds a win/loss/draw record for every player from every scored fecha, then reduces
 * that into totals and a current streak. Matches without both scores loaded are ignored
 * entirely — they haven't happened yet, as far as the record is concerned.
 */
export function computePlayerStats(
  entries: MatchWithSlots[],
  votesByMatch: Map<string, MvpVote[]> = new Map(),
): Map<string, PlayerStats> {
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

  for (const votes of votesByMatch.values()) {
    for (const playerId of mvpWinners(votes)) {
      const s = stats.get(playerId) ?? emptyStats()
      s.mvpCount++
      stats.set(playerId, s)
    }
  }

  return stats
}

export function statsFor(stats: Map<string, PlayerStats>, playerId: string): PlayerStats {
  return stats.get(playerId) ?? emptyStats()
}
