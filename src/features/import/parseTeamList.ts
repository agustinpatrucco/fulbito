export type ParsedList = {
  /** Raw entry text, in the order it appeared. */
  A: string[]
  B: string[]
  /** True when no EQUIPO/TEAM headers were found and we had to guess the split. */
  guessed: boolean
}

const HEADER = /^\s*(equipo|team)\s*[:-]?\s*([12ab])\b/i

/** Leading bullets and numbering: "- ", "* ", "• ", "1. ", "1) ", "1 - ". */
const BULLET = /^\s*(?:[-*•·—–]|\d+\s*[.)-])\s*/

/**
 * Trailing annotations people add in WhatsApp: "(arquero)", "?", "✅", "- POR".
 * Parenthesised notes and emoji go; a hyphenated surname must survive, so only strip a
 * trailing dash-segment when it looks like a position code.
 */
const TRAILING_NOTE = /\s*\((?:[^)]*)\)\s*$/
const TRAILING_POSITION = /\s*[-–]\s*(POR|DFC|MC|DC|arq(?:uero)?)\s*$/i
// Escapes rather than literal emoji: the ranges already cover ✔ ✅ ❌ 👍, and pasting
// the glyphs in source risks combining sequences that don't match what they look like.
const EMOJI_AND_MARKS =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}?¿!¡]/gu
/** The variation selector that trails many emoji. Kept separate — it's a combining mark,
    and mixing it into the class above makes the class match things it doesn't look like. */
const VARIATION_SELECTOR = /️/g

export function cleanEntry(line: string): string {
  return line
    .replace(BULLET, '')
    .replace(EMOJI_AND_MARKS, '')
    .replace(VARIATION_SELECTOR, '')
    .replace(TRAILING_NOTE, '')
    .replace(TRAILING_POSITION, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Turns a pasted WhatsApp-style list into two teams.
 *
 * Expected shape (headers in any case, "TEAM 1"/"EQUIPO A" also work):
 *
 *   EQUIPO 1
 *   - Nico
 *   - Juanchi
 *
 *   EQUIPO 2
 *   - Fede
 *
 * Without headers it falls back to splitting an even list down the middle, which is the
 * other way these lists commonly arrive.
 */
export function parseTeamList(text: string): ParsedList {
  const lines = text.split(/\r?\n/)
  const teams: { A: string[]; B: string[] } = { A: [], B: [] }

  let current: 'A' | 'B' | null = null
  let sawHeader = false

  for (const line of lines) {
    if (!line.trim()) continue

    const header = line.match(HEADER)
    if (header) {
      sawHeader = true
      const marker = header[2].toLowerCase()
      current = marker === '1' || marker === 'a' ? 'A' : 'B'
      continue
    }

    const entry = cleanEntry(line)
    if (!entry) continue

    // Entries before any header belong to team 1 — people often omit the first header.
    teams[current ?? 'A'].push(entry)
  }

  if (sawHeader) return { ...teams, guessed: false }

  // No headers: an even list splits down the middle, an odd one all goes to team 1 and
  // the user sorts it out on the pitch.
  const all = teams.A
  if (all.length >= 2 && all.length % 2 === 0) {
    const half = all.length / 2
    return { A: all.slice(0, half), B: all.slice(half), guessed: true }
  }
  return { A: all, B: [], guessed: true }
}
