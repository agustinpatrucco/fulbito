import type { Formation, Slot, TeamSize } from '../types'

/**
 * Every formation includes exactly one POR, so the label counts outfield players only
 * (a "2-2-1" is six on the pitch). Rows are listed back to front.
 */
export const FORMATIONS: Formation[] = [
  {
    id: '6-2-2-1',
    label: '2-2-1',
    size: 6,
    rows: [
      { position: 'POR', count: 1 },
      { position: 'DFC', count: 2 },
      { position: 'MC', count: 2 },
      { position: 'DC', count: 1 },
    ],
  },
  {
    id: '6-1-3-1',
    label: '1-3-1',
    size: 6,
    rows: [
      { position: 'POR', count: 1 },
      { position: 'DFC', count: 1 },
      { position: 'MC', count: 3 },
      { position: 'DC', count: 1 },
    ],
  },
  {
    id: '6-3-1-1',
    label: '3-1-1',
    size: 6,
    rows: [
      { position: 'POR', count: 1 },
      { position: 'DFC', count: 3 },
      { position: 'MC', count: 1 },
      { position: 'DC', count: 1 },
    ],
  },
  {
    id: '6-2-1-2',
    label: '2-1-2',
    size: 6,
    rows: [
      { position: 'POR', count: 1 },
      { position: 'DFC', count: 2 },
      { position: 'MC', count: 1 },
      { position: 'DC', count: 2 },
    ],
  },
  {
    id: '7-2-3-1',
    label: '2-3-1',
    size: 7,
    rows: [
      { position: 'POR', count: 1 },
      { position: 'DFC', count: 2 },
      { position: 'MC', count: 3 },
      { position: 'DC', count: 1 },
    ],
  },
  {
    id: '7-3-2-1',
    label: '3-2-1',
    size: 7,
    rows: [
      { position: 'POR', count: 1 },
      { position: 'DFC', count: 3 },
      { position: 'MC', count: 2 },
      { position: 'DC', count: 1 },
    ],
  },
  {
    id: '7-2-2-2',
    label: '2-2-2',
    size: 7,
    rows: [
      { position: 'POR', count: 1 },
      { position: 'DFC', count: 2 },
      { position: 'MC', count: 2 },
      { position: 'DC', count: 2 },
    ],
  },
  {
    id: '7-3-1-2',
    label: '3-1-2',
    size: 7,
    rows: [
      { position: 'POR', count: 1 },
      { position: 'DFC', count: 3 },
      { position: 'MC', count: 1 },
      { position: 'DC', count: 2 },
    ],
  },
]

export const DEFAULT_FORMATION: Record<TeamSize, string> = {
  6: '6-2-2-1',
  7: '7-2-3-1',
}

export function formationsForSize(size: TeamSize): Formation[] {
  return FORMATIONS.filter((f) => f.size === size)
}

export function getFormation(id: string): Formation {
  const found = FORMATIONS.find((f) => f.id === id)
  if (!found) throw new Error(`Unknown formation: ${id}`)
  return found
}

/** Flattens a formation's rows into the empty slot list the pitch renders. */
export function buildSlots(formation: Formation): Slot[] {
  const slots: Slot[] = []
  for (const row of formation.rows) {
    for (let i = 0; i < row.count; i++) {
      slots.push({ index: slots.length, position: row.position, playerId: null })
    }
  }
  return slots
}
