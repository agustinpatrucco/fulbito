import type { Match, MatchDraft, Slot, TeamId } from '../types'
import { supabase, isCloudMode } from './supabase'

/**
 * Same split as `playerStore`: Supabase in cloud mode so a fecha created on the phone
 * shows up on the laptop, localStorage in local mode so the app still works before
 * Supabase exists.
 */
export type MatchStore = {
  list(): Promise<Match[]>
  create(draft: MatchDraft, formationA: string, formationB: string): Promise<Match>
  /** Bulk-replaces one team's slots — simpler and safer than per-cell updates when a
      formation change or a swap touches more than one row at once. */
  saveSlots(matchId: string, team: TeamId, slots: Slot[]): Promise<void>
  setFormation(matchId: string, team: TeamId, formationId: string): Promise<void>
  loadSlots(matchId: string): Promise<{ A: Slot[]; B: Slot[] }>
  /** One query for every match's lineup at once — what Historial and the win/streak
      stats need, versus the single `loadSlots` the pitch uses for just the current one. */
  loadAllSlots(matchIds: string[]): Promise<Map<string, { A: Slot[]; B: Slot[] }>>
  setResult(matchId: string, scoreA: number, scoreB: number): Promise<Match>
}

// --- row mapping --------------------------------------------------------------

type MatchRow = {
  id: string
  scheduled_at: string
  cancha: string
  team_size: number
  formation_a: string
  formation_b: string
  score_a: number | null
  score_b: number | null
  created_at: string
}

function fromRow(row: MatchRow): Match {
  return {
    id: row.id,
    scheduledAt: row.scheduled_at,
    cancha: row.cancha as Match['cancha'],
    teamSize: row.team_size as Match['teamSize'],
    formationA: row.formation_a,
    formationB: row.formation_b,
    scoreA: row.score_a,
    scoreB: row.score_b,
    createdAt: row.created_at,
  }
}

type SlotRow = {
  match_id: string
  team: string
  slot_index: number
  position: string
  player_id: string | null
}

function slotsFromRows(rows: SlotRow[]): Slot[] {
  return rows
    .sort((a, b) => a.slot_index - b.slot_index)
    .map((r) => ({
      index: r.slot_index,
      position: r.position as Slot['position'],
      playerId: r.player_id,
    }))
}

// --- cloud ----------------------------------------------------------------------

const cloudStore: MatchStore = {
  async list() {
    const { data, error } = await supabase!
      .from('matches')
      .select('*')
      .order('scheduled_at', { ascending: false })
    if (error) throw error
    return (data as MatchRow[]).map(fromRow)
  },

  async create(draft, formationA, formationB) {
    const { data, error } = await supabase!
      .from('matches')
      .insert({
        scheduled_at: draft.scheduledAt,
        cancha: draft.cancha,
        team_size: draft.teamSize,
        formation_a: formationA,
        formation_b: formationB,
      })
      .select()
      .single()
    if (error) throw error
    return fromRow(data as MatchRow)
  },

  async saveSlots(matchId, team, slots) {
    const { error } = await supabase!.from('match_slots').upsert(
      slots.map((s) => ({
        match_id: matchId,
        team,
        slot_index: s.index,
        position: s.position,
        player_id: s.playerId,
      })),
    )
    if (error) throw error
  },

  async setFormation(matchId, team, formationId) {
    const column = team === 'A' ? 'formation_a' : 'formation_b'
    const { error } = await supabase!.from('matches').update({ [column]: formationId }).eq('id', matchId)
    if (error) throw error
  },

  async loadSlots(matchId) {
    const { data, error } = await supabase!.from('match_slots').select('*').eq('match_id', matchId)
    if (error) throw error
    const rows = data as SlotRow[]
    return {
      A: slotsFromRows(rows.filter((r) => r.team === 'A')),
      B: slotsFromRows(rows.filter((r) => r.team === 'B')),
    }
  },

  async loadAllSlots(matchIds) {
    const result = new Map<string, { A: Slot[]; B: Slot[] }>()
    if (matchIds.length === 0) return result
    const { data, error } = await supabase!.from('match_slots').select('*').in('match_id', matchIds)
    if (error) throw error
    const rows = data as SlotRow[]
    for (const id of matchIds) {
      const forMatch = rows.filter((r) => r.match_id === id)
      result.set(id, {
        A: slotsFromRows(forMatch.filter((r) => r.team === 'A')),
        B: slotsFromRows(forMatch.filter((r) => r.team === 'B')),
      })
    }
    return result
  },

  async setResult(matchId, scoreA, scoreB) {
    const { data, error } = await supabase!
      .from('matches')
      .update({ score_a: scoreA, score_b: scoreB })
      .eq('id', matchId)
      .select()
      .single()
    if (error) throw error
    return fromRow(data as MatchRow)
  },
}

// --- local ------------------------------------------------------------------------

const MATCHES_KEY = 'fulbito.matches.v1'
const SLOTS_KEY = 'fulbito.match_slots.v1'

type LocalSlots = Record<string, { A: Slot[]; B: Slot[] }>

function readMatches(): Match[] {
  try {
    const raw = localStorage.getItem(MATCHES_KEY)
    return raw ? (JSON.parse(raw) as Match[]) : []
  } catch {
    return []
  }
}

function writeMatches(matches: Match[]) {
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches))
}

function readAllSlots(): LocalSlots {
  try {
    const raw = localStorage.getItem(SLOTS_KEY)
    return raw ? (JSON.parse(raw) as LocalSlots) : {}
  } catch {
    return {}
  }
}

function writeAllSlots(slots: LocalSlots) {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots))
}

const localStore: MatchStore = {
  async list() {
    return readMatches().sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    )
  },

  async create(draft, formationA, formationB) {
    const match: Match = {
      id: crypto.randomUUID(),
      scheduledAt: draft.scheduledAt,
      cancha: draft.cancha,
      teamSize: draft.teamSize,
      formationA,
      formationB,
      scoreA: null,
      scoreB: null,
      createdAt: new Date().toISOString(),
    }
    writeMatches([...readMatches(), match])
    return match
  },

  async saveSlots(matchId, team, slots) {
    const all = readAllSlots()
    const current = all[matchId] ?? { A: [], B: [] }
    all[matchId] = { ...current, [team]: slots }
    writeAllSlots(all)
  },

  async setFormation(matchId, team, formationId) {
    const matches = readMatches()
    const index = matches.findIndex((m) => m.id === matchId)
    if (index === -1) throw new Error(`No existe la fecha ${matchId}`)
    const column = team === 'A' ? 'formationA' : 'formationB'
    matches[index] = { ...matches[index], [column]: formationId }
    writeMatches(matches)
  },

  async loadSlots(matchId) {
    return readAllSlots()[matchId] ?? { A: [], B: [] }
  },

  async loadAllSlots(matchIds) {
    const all = readAllSlots()
    const result = new Map<string, { A: Slot[]; B: Slot[] }>()
    for (const id of matchIds) result.set(id, all[id] ?? { A: [], B: [] })
    return result
  },

  async setResult(matchId, scoreA, scoreB) {
    const matches = readMatches()
    const index = matches.findIndex((m) => m.id === matchId)
    if (index === -1) throw new Error(`No existe la fecha ${matchId}`)
    matches[index] = { ...matches[index], scoreA, scoreB }
    writeMatches(matches)
    return matches[index]
  },
}

export const matchStore: MatchStore = isCloudMode ? cloudStore : localStore
