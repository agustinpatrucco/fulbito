import { describe, expect, it } from 'vitest'
import type { Cancha, Match, MvpVote, Slot } from '../../types'
import { computePlayerStats, MIN_STREAK_TO_SHOW, statsFor, type MatchWithSlots } from './stats'

let seq = 0
function makeMatch(overrides: Partial<Match> = {}): Match {
  seq++
  return {
    id: `m${seq}`,
    scheduledAt: `2026-01-${String(seq).padStart(2, '0')}T20:00:00.000Z`,
    cancha: 'Quintana',
    teamSize: 6,
    formationA: '6-2-2-1',
    formationB: '6-2-2-1',
    scoreA: null,
    scoreB: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function slot(index: number, playerId: string | null): Slot {
  return { index, position: 'MC', playerId }
}

/** Builds a scored match where `winners` played for the winning team and `losers` for
    the other, so tests can talk about outcomes instead of literal scores. */
function scoredMatch(
  winners: string[],
  losers: string[],
  opts: { scheduledAt?: string; cancha?: Cancha; draw?: boolean } = {},
): MatchWithSlots {
  const match = makeMatch({
    scheduledAt: opts.scheduledAt,
    cancha: opts.cancha,
    scoreA: opts.draw ? 1 : 2,
    scoreB: 1,
  })
  return {
    match,
    slots: {
      A: winners.map((id, i) => slot(i, id)),
      B: losers.map((id, i) => slot(i, id)),
    },
  }
}

describe('computePlayerStats', () => {
  it('counts a win for the winning team and nothing for the losing team', () => {
    const stats = computePlayerStats([scoredMatch(['agus'], ['nico'])])
    expect(statsFor(stats, 'agus').wins).toBe(1)
    expect(statsFor(stats, 'nico').wins).toBe(0)
  })

  it('ignores matches without a loaded result', () => {
    const unplayed: MatchWithSlots = {
      match: makeMatch({ scoreA: null, scoreB: null }),
      slots: { A: [slot(0, 'agus')], B: [slot(0, 'nico')] },
    }
    const stats = computePlayerStats([unplayed])
    expect(statsFor(stats, 'agus').wins).toBe(0)
    expect(statsFor(stats, 'agus').streak).toBe(0)
  })

  it('gives nobody a win on a draw', () => {
    const stats = computePlayerStats([scoredMatch(['agus'], ['nico'], { draw: true })])
    expect(statsFor(stats, 'agus').wins).toBe(0)
    expect(statsFor(stats, 'nico').wins).toBe(0)
  })

  it('tallies wins by cancha separately', () => {
    const stats = computePlayerStats([
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-01T20:00:00Z', cancha: 'Quintana' }),
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-08T20:00:00Z', cancha: 'Complejo' }),
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-15T20:00:00Z', cancha: 'Quintana' }),
    ])
    expect(statsFor(stats, 'agus').winsByCancha).toEqual({ Quintana: 2, Complejo: 1 })
  })

  it('builds a streak from consecutive wins, most recent first', () => {
    const stats = computePlayerStats([
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-01T20:00:00Z' }),
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-08T20:00:00Z' }),
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-15T20:00:00Z' }),
    ])
    expect(statsFor(stats, 'agus').streak).toBe(3)
  })

  it('is order-independent — sorts by scheduledAt regardless of input order', () => {
    const stats = computePlayerStats([
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-15T20:00:00Z' }),
      scoredMatch(['nico'], ['agus'], { scheduledAt: '2026-01-01T20:00:00Z' }),
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-08T20:00:00Z' }),
    ])
    // Chronologically: loss, win, win — streak should be 2, not corrupted by input order.
    expect(statsFor(stats, 'agus').streak).toBe(2)
  })

  it('a draw breaks the streak', () => {
    const stats = computePlayerStats([
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-01T20:00:00Z' }),
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-08T20:00:00Z', draw: true }),
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-15T20:00:00Z' }),
    ])
    expect(statsFor(stats, 'agus').streak).toBe(1)
  })

  it('a loss breaks the streak', () => {
    const stats = computePlayerStats([
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-01T20:00:00Z' }),
      scoredMatch(['nico'], ['agus'], { scheduledAt: '2026-01-08T20:00:00Z' }),
      scoredMatch(['agus'], ['nico'], { scheduledAt: '2026-01-15T20:00:00Z' }),
    ])
    expect(statsFor(stats, 'agus').streak).toBe(1)
  })

  it('returns zeroed stats for a player with no history', () => {
    const stats = computePlayerStats([scoredMatch(['agus'], ['nico'])])
    expect(statsFor(stats, 'ghost')).toEqual({
      wins: 0,
      winsByCancha: { Quintana: 0, Complejo: 0 },
      streak: 0,
      mvpCount: 0,
    })
  })

  it('handles an empty match list', () => {
    expect(computePlayerStats([]).size).toBe(0)
  })
})

describe('computePlayerStats MVP tally', () => {
  function vote(matchId: string, voterPlayerId: string, votedPlayerId: string): MvpVote {
    return { matchId, voterPlayerId, votedPlayerId, createdAt: '2026-01-01T00:00:00.000Z' }
  }

  it('awards MVP to whoever got the most votes', () => {
    const entry = scoredMatch(['agus'], ['nico'])
    const votesByMatch = new Map<string, MvpVote[]>([
      [entry.match.id, [vote(entry.match.id, 'agus', 'nico'), vote(entry.match.id, 'nico', 'nico')]],
    ])
    const stats = computePlayerStats([entry], votesByMatch)
    expect(statsFor(stats, 'nico').mvpCount).toBe(1)
    expect(statsFor(stats, 'agus').mvpCount).toBe(0)
  })

  it('awards MVP to everyone tied for the top vote count', () => {
    const entry = scoredMatch(['agus'], ['nico'])
    const votesByMatch = new Map<string, MvpVote[]>([
      [entry.match.id, [vote(entry.match.id, 'agus', 'nico'), vote(entry.match.id, 'nico', 'agus')]],
    ])
    const stats = computePlayerStats([entry], votesByMatch)
    expect(statsFor(stats, 'agus').mvpCount).toBe(1)
    expect(statsFor(stats, 'nico').mvpCount).toBe(1)
  })

  it('leaves mvpCount at 0 when nobody voted', () => {
    const entry = scoredMatch(['agus'], ['nico'])
    const stats = computePlayerStats([entry], new Map([[entry.match.id, []]]))
    expect(statsFor(stats, 'agus').mvpCount).toBe(0)
  })
})

describe('MIN_STREAK_TO_SHOW', () => {
  it('is 2, per product decision: only a streak of 2+ shows the fire badge', () => {
    expect(MIN_STREAK_TO_SHOW).toBe(2)
  })
})
