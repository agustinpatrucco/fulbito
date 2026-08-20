/** Position codes are domain terms and stay in Spanish everywhere, including the DB. */
export const POSITIONS = ['POR', 'DFC', 'MC', 'DC'] as const
export type Position = (typeof POSITIONS)[number]

export const TIERS = ['gold', 'silver', 'bronze'] as const
export type Tier = (typeof TIERS)[number]

export const NACIONALIDADES = ['Argentina', 'España', 'Uruguay'] as const
export type Nacionalidad = (typeof NACIONALIDADES)[number]

export const CLUBES = [
  'Barcelona',
  'Boca Juniors',
  'Independiente',
  'Racing',
  'Real Madrid',
  'River Plate',
  'San Lorenzo',
] as const
export type Club = (typeof CLUBES)[number]

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
  /** Badge shown on the card. Null shows nothing — most players won't set this. */
  nacionalidad: Nacionalidad | null
  /** Badge shown on the card. Null shows nothing — most players won't set this. */
  club: Club | null
  active: boolean
  createdAt: string
  /** The first player created in a group becomes its admin. Never settable through the
      general edit form — only decided once, at creation. */
  isAdmin: boolean
  /** Null until the first time anyone picks this player — at that point they're asked
      to set a password, which then gates every future login as them. Blocks logging in
      as someone else, not a real security boundary (this data is as open as everything
      else in the app). */
  passwordHash: string | null
  passwordSalt: string | null
}

/** What the forms hand to the store — no id, no timestamp, and none of the login-only
    fields (isAdmin, password) — those are set outside the general edit form. */
export type PlayerDraft = Omit<
  Player,
  'id' | 'createdAt' | 'isAdmin' | 'passwordHash' | 'passwordSalt'
>

/** One separate roster, unlocked by its own 6-character code. */
export type Group = {
  id: string
  code: string
}

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

export const CANCHAS = ['Quintana', 'Complejo'] as const
export type Cancha = (typeof CANCHAS)[number]

export type Match = {
  id: string
  /** ISO datetime. Locking and history ordering both hinge on this one field. */
  scheduledAt: string
  cancha: Cancha
  teamSize: TeamSize
  formationA: string
  formationB: string
  /** Both set together, via the result form. Null means "not played yet". */
  scoreA: number | null
  scoreB: number | null
  createdAt: string
}

export type MatchDraft = Pick<Match, 'scheduledAt' | 'cancha' | 'teamSize'>

/** A match is locked the instant its kickoff time passes — no manual step needed. */
export function isLocked(match: Match, now: Date = new Date()): boolean {
  return new Date(match.scheduledAt).getTime() <= now.getTime()
}

const RESULT_UNLOCK_MS = 60 * 60 * 1000

/** Resultado entry and MVP voting both open together, an hour after kickoff — enough
    time for the match to actually finish. */
export function canEnterResult(match: Match, now: Date = new Date()): boolean {
  return new Date(match.scheduledAt).getTime() + RESULT_UNLOCK_MS <= now.getTime()
}

/** One player's MVP pick for one match. Final once cast — the DB has no update/delete
    policy for this table, so there's no "changed my vote" path anywhere. */
export type MvpVote = {
  matchId: string
  voterPlayerId: string
  votedPlayerId: string
  createdAt: string
}

export function hasResult(match: Match): boolean {
  return match.scoreA !== null && match.scoreB !== null
}

export type WinnerTeam = TeamId | 'draw' | null

/** Null until both scores are in. */
export function winnerOf(match: Match): WinnerTeam {
  if (!hasResult(match)) return null
  if (match.scoreA === match.scoreB) return 'draw'
  return match.scoreA! > match.scoreB! ? 'A' : 'B'
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
