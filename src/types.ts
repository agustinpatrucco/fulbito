/** Position codes are domain terms and stay in Spanish everywhere, including the DB. */
export const POSITIONS = ['POR', 'DFC', 'MC', 'DC'] as const
export type Position = (typeof POSITIONS)[number]

export const TIERS = ['gold', 'silver', 'bronze'] as const
export type Tier = (typeof TIERS)[number]

export type Player = {
  id: string
  name: string
  /** Shown on the card when set — that's what everyone actually calls them. */
  nickname: string | null
  /** Extra spellings that should resolve to this player when importing a text list. */
  aliases: string[]
  /** Ordered by preference; the first one is their natural position. */
  positions: Position[]
  tier: Tier
  photoUrl: string | null
  /** Storage key. Needed to delete the old file when a photo is replaced. */
  photoPath: string | null
  active: boolean
  createdAt: string
}

/** What the forms hand to the store — no id, no timestamp. */
export type PlayerDraft = Omit<Player, 'id' | 'createdAt'>

export type TeamId = 'A' | 'B'
export type TeamSize = 6 | 7

export type FormationRow = { position: Position; count: number }

export type Formation = {
  id: string
  label: string
  size: TeamSize
  /** Back to front: POR first, attackers last. */
  rows: FormationRow[]
}

/** One place on the pitch. `playerId` null means empty. */
export type Slot = {
  index: number
  position: Position
  playerId: string | null
}

export type Squad = {
  formationId: string
  slots: Slot[]
}

export const POSITION_LABELS: Record<Position, string> = {
  POR: 'Portero',
  DFC: 'Defensa',
  MC: 'Mediocampista',
  DC: 'Delantero',
}

export const TIER_LABELS: Record<Tier, string> = {
  gold: 'Oro',
  silver: 'Plata',
  bronze: 'Bronce',
}

/** The name to print on the card. */
export function displayName(player: Player): string {
  return player.nickname?.trim() || player.name
}

/** Advisory only — a mismatch draws a red ring, it never blocks the assignment. */
export function isOutOfPosition(player: Player, slotPosition: Position): boolean {
  return !player.positions.includes(slotPosition)
}
