import { describe, expect, it } from 'vitest'
import type { Player, Position, Tier } from '../../types'
import { matchPlayers, normalize, scorePlayer } from './matchPlayers'

function makePlayer(
  name: string,
  extras: { nickname?: string; aliases?: string[]; positions?: Position[]; tier?: Tier } = {},
): Player {
  return {
    id: name,
    name,
    nickname: extras.nickname ?? null,
    aliases: extras.aliases ?? [],
    positions: extras.positions ?? ['MC'],
    tier: extras.tier ?? 'silver',
    photoUrl: null,
    photoPath: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    isAdmin: false,
  }
}

const roster = [
  makePlayer('Agustín Patrucco', { nickname: 'Agus' }),
  makePlayer('Nicolás Fernández', { nickname: 'Nico' }),
  makePlayer('Federico Gómez', { aliases: ['El Flaco'] }),
  makePlayer('Tomás Ruiz'),
]

describe('normalize', () => {
  it('strips accents, case and punctuation', () => {
    expect(normalize('Agustín  Patrucco!')).toBe('agustin patrucco')
    expect(normalize('NICOLÁS')).toBe('nicolas')
  })
})

describe('scorePlayer', () => {
  const agus = roster[0]

  it('scores an exact name as 1', () => {
    expect(scorePlayer('Agustín Patrucco', agus)).toBe(1)
  })

  it('ignores missing accents', () => {
    expect(scorePlayer('agustin patrucco', agus)).toBe(1)
  })

  it('matches the nickname', () => {
    expect(scorePlayer('Agus', agus)).toBe(1)
  })

  it('matches a surname on its own', () => {
    expect(scorePlayer('Patrucco', agus)).toBe(1)
  })

  it('tolerates a typo', () => {
    expect(scorePlayer('Patruco', agus)).toBeGreaterThan(0.85)
  })

  it('matches an alias', () => {
    expect(scorePlayer('El Flaco', roster[2])).toBe(1)
  })

  it('gives a stranger a low score', () => {
    expect(scorePlayer('Bartolomeo', agus)).toBeLessThan(0.55)
  })
})

describe('matchPlayers', () => {
  it('resolves nicknames, surnames and typos in one pass', () => {
    const results = matchPlayers(['Agus', 'Fernández', 'El Flaco', 'Tomas Ruis'], roster)
    expect(results.map((r) => r.player?.name)).toEqual([
      'Agustín Patrucco',
      'Nicolás Fernández',
      'Federico Gómez',
      'Tomás Ruiz',
    ])
    expect(results.every((r) => r.confidence === 'auto')).toBe(true)
  })

  it('leaves an unknown name unmatched instead of forcing a bad guess', () => {
    const results = matchPlayers(['Bartolomeo Zzyzx'], roster)
    expect(results[0].player).toBeNull()
    expect(results[0].confidence).toBe('none')
  })

  it('never assigns the same player to two entries', () => {
    // Both lines look like Nicolás; the better match wins and the other is left open.
    const results = matchPlayers(['Nico', 'Nicolás'], roster)
    const matched = results.map((r) => r.player?.id).filter(Boolean)
    expect(new Set(matched).size).toBe(matched.length)
  })

  it('prefers the exact match when two entries compete for one player', () => {
    const results = matchPlayers(['Nicolás Fernández', 'Nico'], roster)
    expect(results[0].player?.name).toBe('Nicolás Fernández')
    expect(results[0].score).toBe(1)
  })

  it('auto-matches a full name even with a typo in each part', () => {
    const [result] = matchPlayers(['Federicu Gomes'], roster)
    expect(result.player?.name).toBe('Federico Gómez')
    expect(result.confidence).toBe('auto')
  })

  it('flags a weak-but-plausible match as suggested rather than auto', () => {
    // One mangled token is a guess worth showing, not one worth applying silently.
    const [result] = matchPlayers(['Federik'], roster)
    expect(result.player?.name).toBe('Federico Gómez')
    expect(result.confidence).toBe('suggested')
  })

  it('handles an empty roster', () => {
    expect(matchPlayers(['Agus'], [])).toEqual([
      { entry: 'Agus', player: null, score: 0, confidence: 'none' },
    ])
  })
})
