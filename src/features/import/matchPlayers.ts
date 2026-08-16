import type { Player } from '../../types'

export type Confidence = 'auto' | 'suggested' | 'none'

export type MatchResult = {
  /** The cleaned line from the pasted list. */
  entry: string
  player: Player | null
  score: number
  confidence: Confidence
}

export const AUTO_THRESHOLD = 0.85
export const SUGGEST_THRESHOLD = 0.55

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    // Combining diacritics, so "Nicolás" and "nicolas" are the same string.
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Every string that should resolve to this player: full name, nickname, aliases, and
 * each individual name token — so "Agus", "Patrucco" and "Agustín P" all land on
 * Agustín Patrucco.
 */
export function candidateKeys(player: Player): string[] {
  const sources = [player.name, player.nickname ?? '', ...player.aliases].filter(Boolean)
  const keys = new Set<string>()

  for (const source of sources) {
    const norm = normalize(source)
    if (!norm) continue
    keys.add(norm)
    // Single tokens only help when they're distinctive; two letters is noise.
    for (const token of norm.split(' ')) {
      if (token.length >= 3) keys.add(token)
    }
  }
  return [...keys]
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    prev = row
  }
  return prev[b.length]
}

function editSimilarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length)
  return longest === 0 ? 0 : 1 - levenshtein(a, b) / longest
}

/** Dice coefficient over word tokens — catches reordered or partial names. */
function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(a.split(' ').filter(Boolean))
  const tb = new Set(b.split(' ').filter(Boolean))
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const token of ta) if (tb.has(token)) shared++
  return (2 * shared) / (ta.size + tb.size)
}

/** How well one pasted entry matches one player, over all of that player's keys. */
export function scorePlayer(entry: string, player: Player): number {
  const target = normalize(entry)
  if (!target) return 0

  let best = 0
  for (const key of candidateKeys(player)) {
    if (key === target) return 1

    let score: number
    if (key.length >= 3 && (key.startsWith(target) || target.startsWith(key))) {
      // "Agus" for "Agustin" — a prefix is a strong signal, but shouldn't outrank an
      // exact hit on someone else.
      score = 0.9
    } else {
      score = Math.max(tokenSimilarity(target, key), editSimilarity(target, key))
    }
    best = Math.max(best, score)
  }
  return best
}

function classify(score: number): Confidence {
  if (score >= AUTO_THRESHOLD) return 'auto'
  if (score >= SUGGEST_THRESHOLD) return 'suggested'
  return 'none'
}

/**
 * Resolves a list of pasted entries against the roster.
 *
 * Assignment is global and greedy rather than per-line: every (entry, player) pair is
 * scored, sorted best-first, and consumed with a used-set. That stops two similar lines
 * ("Nico" and "Nicolás") from both claiming the same player just because each one, taken
 * alone, matched them best.
 */
export function matchPlayers(entries: string[], roster: Player[]): MatchResult[] {
  const results: MatchResult[] = entries.map((entry) => ({
    entry,
    player: null,
    score: 0,
    confidence: 'none',
  }))

  const pairs: { entryIndex: number; player: Player; score: number }[] = []
  entries.forEach((entry, entryIndex) => {
    for (const player of roster) {
      const score = scorePlayer(entry, player)
      if (score >= SUGGEST_THRESHOLD) pairs.push({ entryIndex, player, score })
    }
  })

  pairs.sort((a, b) => b.score - a.score)

  const takenPlayers = new Set<string>()
  const takenEntries = new Set<number>()
  for (const pair of pairs) {
    if (takenEntries.has(pair.entryIndex) || takenPlayers.has(pair.player.id)) continue
    takenEntries.add(pair.entryIndex)
    takenPlayers.add(pair.player.id)
    results[pair.entryIndex] = {
      entry: entries[pair.entryIndex],
      player: pair.player,
      score: pair.score,
      confidence: classify(pair.score),
    }
  }

  return results
}
