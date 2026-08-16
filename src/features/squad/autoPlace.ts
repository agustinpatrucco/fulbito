import type { Formation, Player, Slot } from '../../types'
import { buildSlots } from '../../data/formations'

/**
 * Fills a formation with the given players, trying to avoid out-of-position
 * assignments. Shared by the formation switcher and the text-list importer.
 *
 * Strategy: fill the scarcest slots first (a POR slot when only one person keeps goal
 * must be decided before a MC slot that five people can fill), and within a slot prefer
 * the most specialised player, then whoever ranks that position highest in their own
 * preference order. Anyone left over drops into whatever slots remain — which is where
 * the red rings come from, and that's the point: it shows you what needs fixing.
 *
 * Players beyond the formation's size are returned in `overflow` and belong on the bench.
 */
export function autoPlace(
  players: Player[],
  formation: Formation,
): { slots: Slot[]; overflow: Player[] } {
  const slots = buildSlots(formation)
  const remaining = new Map(players.map((p) => [p.id, p]))

  const covers = (p: Player, slot: Slot) => p.positions.includes(slot.position)

  // Order slots by how few of the available players can actually cover them.
  const order = [...slots].sort((a, b) => {
    const supply = (s: Slot) => players.filter((p) => covers(p, s)).length
    return supply(a) - supply(b)
  })

  for (const slot of order) {
    const candidates = [...remaining.values()].filter((p) => covers(p, slot))
    if (candidates.length === 0) continue

    candidates.sort((a, b) => {
      // Fewer positions = more specialised = harder to place elsewhere.
      if (a.positions.length !== b.positions.length) {
        return a.positions.length - b.positions.length
      }
      // Then: whoever considers this their more natural position.
      return a.positions.indexOf(slot.position) - b.positions.indexOf(slot.position)
    })

    const pick = candidates[0]
    slots[slot.index].playerId = pick.id
    remaining.delete(pick.id)
  }

  // Anything still empty gets whoever is left, out of position or not.
  const leftovers = [...remaining.values()]
  for (const slot of slots) {
    if (slot.playerId !== null) continue
    const next = leftovers.shift()
    if (!next) break
    slot.playerId = next.id
    remaining.delete(next.id)
  }

  return { slots, overflow: leftovers }
}

/**
 * Re-fits an existing lineup into a different formation. Players already on the pitch
 * keep their place when the new shape still has a slot for their position; the rest are
 * re-placed by `autoPlace`. Switching 2-2-1 -> 1-3-1 should never wipe the board.
 */
export function refit(
  currentSlots: Slot[],
  formation: Formation,
  byId: Map<string, Player>,
): { slots: Slot[]; overflow: Player[] } {
  const assigned = currentSlots
    .map((s) => (s.playerId ? byId.get(s.playerId) : null))
    .filter((p): p is Player => Boolean(p))
  return autoPlace(assigned, formation)
}
