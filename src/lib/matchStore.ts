import type { Match, MatchDraft, MvpVote, Slot, TeamId } from '../types'
import { supabase, isCloudMode } from './supabase'

/**
 * Same split as `playerStore`: Supabase in cloud mode so a fecha created on the phone
 * shows up on the laptop, localStorage in local mode so the app still works before
 * Supabase exists. Every method takes the active group's id — in cloud mode only
 * `list`/`create` actually need it (match ids are already globally unique), but local
 * mode keys its storage per group too, so it's threaded through everywhere for one
 * consistent interface.
 */
export type MatchStore = {
  list(groupId: string): Promise<Match[]>
  create(groupId: string, draft: MatchDraft, formationA: string, formationB: string): Promise<Match>
  /** Bulk-replaces one team's slots — simpler and safer than per-cell updates when a
      formation change or a swap touches more than one row at once. */
  saveSlots(groupId: string, matchId: string, team: TeamId, slots: Slot[]): Promise<void>
  setFormation(groupId: string, matchId: string, team: TeamId, formationId: string): Promise<void>
  loadSlots(groupId: string, matchId: string): Promise<{ A: Slot[]; B: Slot[] }>
  /** One query for every match's lineup at once — what Historial and the win/streak
      stats need, versus the single `loadSlots` the pitch uses for just the current one. */
  loadAllSlots(groupId: string, matchIds: string[]): Promise<Map<string, { A: Slot[]; B: Slot[] }>>
  setResult(groupId: string, matchId: string, scoreA: number, scoreB: number): Promise<Match>
  /** One query for every match's MVP votes at once — same shape as `loadAllSlots`. */
  listMvpVotes(groupId: string, matchIds: string[]): Promise<Map<string, MvpVote[]>>
  /** Throws if this player already voted in this match — a vote is final. */
  castMvpVote(
    groupId: string,
    matchId: string,
    voterPlayerId: string,
    votedPlayerId: string,
  ): Promise<MvpVote>
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

type MvpVoteRow = {
  match_id: string
  voter_player_id: string
  voted_player_id: string
  created_at: string
}

function voteFromRow(row: MvpVoteRow): MvpVote {
  return {
    matchId: row.match_id,
    voterPlayerId: row.voter_player_id,
    votedPlayerId: row.voted_player_id,
    createdAt: row.created_at,
  }
}

// --- cloud ----------------------------------------------------------------------

const cloudStore: MatchStore = {
  async list(groupId) {
    const { data, error } = await supabase!
      .from('matches')
      .select('*')
      .eq('group_id', groupId)
      .order('scheduled_at', { ascending: false })
    if (error) throw error
    return (data as MatchRow[]).map(fromRow)
  },

  async create(groupId, draft, formationA, formationB) {
    const { data, error } = await supabase!
      .from('matches')
      .insert({
        group_id: groupId,
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

  async saveSlots(_groupId, matchId, team, slots) {
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

  async setFormation(_groupId, matchId, team, formationId) {
    const column = team === 'A' ? 'formation_a' : 'formation_b'
    const { error } = await supabase!.from('matches').update({ [column]: formationId }).eq('id', matchId)
    if (error) throw error
  },

  async loadSlots(_groupId, matchId) {
    const { data, error } = await supabase!.from('match_slots').select('*').eq('match_id', matchId)
    if (error) throw error
    const rows = data as SlotRow[]
    return {
      A: slotsFromRows(rows.filter((r) => r.team === 'A')),
      B: slotsFromRows(rows.filter((r) => r.team === 'B')),
    }
  },

  async loadAllSlots(_groupId, matchIds) {
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

  async setResult(_groupId, matchId, scoreA, scoreB) {
    const { data, error } = await supabase!
      .from('matches')
      .update({ score_a: scoreA, score_b: scoreB })
      .eq('id', matchId)
      .select()
      .single()
    if (error) throw error
    return fromRow(data as MatchRow)
  },

  async listMvpVotes(_groupId, matchIds) {
    const result = new Map<string, MvpVote[]>()
    if (matchIds.length === 0) return result
    for (const id of matchIds) result.set(id, [])
    const { data, error } = await supabase!
      .from('match_mvp_votes')
      .select('*')
      .in('match_id', matchIds)
    if (error) throw error
    for (const row of data as MvpVoteRow[]) {
      result.get(row.match_id)?.push(voteFromRow(row))
    }
    return result
  },

  async castMvpVote(_groupId, matchId, voterPlayerId, votedPlayerId) {
    const { data, error } = await supabase!
      .from('match_mvp_votes')
      .insert({ match_id: matchId, voter_player_id: voterPlayerId, voted_player_id: votedPlayerId })
      .select()
      .single()
    if (error) throw error
    return voteFromRow(data as MvpVoteRow)
  },
}

// --- local ------------------------------------------------------------------------

const matchesKey = (groupId: string) => `fulbito.${groupId}.matches.v1`
const slotsKey = (groupId: string) => `fulbito.${groupId}.match_slots.v1`
const votesKey = (groupId: string) => `fulbito.${groupId}.mvp_votes.v1`

type LocalSlots = Record<string, { A: Slot[]; B: Slot[] }>

function readMatches(groupId: string): Match[] {
  try {
    const raw = localStorage.getItem(matchesKey(groupId))
    return raw ? (JSON.parse(raw) as Match[]) : []
  } catch {
    return []
  }
}

function writeMatches(groupId: string, matches: Match[]) {
  localStorage.setItem(matchesKey(groupId), JSON.stringify(matches))
}

function readAllSlots(groupId: string): LocalSlots {
  try {
    const raw = localStorage.getItem(slotsKey(groupId))
    return raw ? (JSON.parse(raw) as LocalSlots) : {}
  } catch {
    return {}
  }
}

function writeAllSlots(groupId: string, slots: LocalSlots) {
  localStorage.setItem(slotsKey(groupId), JSON.stringify(slots))
}

function readVotes(groupId: string): MvpVote[] {
  try {
    const raw = localStorage.getItem(votesKey(groupId))
    return raw ? (JSON.parse(raw) as MvpVote[]) : []
  } catch {
    return []
  }
}

function writeVotes(groupId: string, votes: MvpVote[]) {
  localStorage.setItem(votesKey(groupId), JSON.stringify(votes))
}

const localStore: MatchStore = {
  async list(groupId) {
    return readMatches(groupId).sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    )
  },

  async create(groupId, draft, formationA, formationB) {
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
    writeMatches(groupId, [...readMatches(groupId), match])
    return match
  },

  async saveSlots(groupId, matchId, team, slots) {
    const all = readAllSlots(groupId)
    const current = all[matchId] ?? { A: [], B: [] }
    all[matchId] = { ...current, [team]: slots }
    writeAllSlots(groupId, all)
  },

  async setFormation(groupId, matchId, team, formationId) {
    const matches = readMatches(groupId)
    const index = matches.findIndex((m) => m.id === matchId)
    if (index === -1) throw new Error(`No existe la fecha ${matchId}`)
    const column = team === 'A' ? 'formationA' : 'formationB'
    matches[index] = { ...matches[index], [column]: formationId }
    writeMatches(groupId, matches)
  },

  async loadSlots(groupId, matchId) {
    return readAllSlots(groupId)[matchId] ?? { A: [], B: [] }
  },

  async loadAllSlots(groupId, matchIds) {
    const all = readAllSlots(groupId)
    const result = new Map<string, { A: Slot[]; B: Slot[] }>()
    for (const id of matchIds) result.set(id, all[id] ?? { A: [], B: [] })
    return result
  },

  async setResult(groupId, matchId, scoreA, scoreB) {
    const matches = readMatches(groupId)
    const index = matches.findIndex((m) => m.id === matchId)
    if (index === -1) throw new Error(`No existe la fecha ${matchId}`)
    matches[index] = { ...matches[index], scoreA, scoreB }
    writeMatches(groupId, matches)
    return matches[index]
  },

  async listMvpVotes(groupId, matchIds) {
    const votes = readVotes(groupId)
    const result = new Map<string, MvpVote[]>()
    for (const id of matchIds) result.set(id, [])
    for (const vote of votes) {
      if (result.has(vote.matchId)) result.get(vote.matchId)!.push(vote)
    }
    return result
  },

  async castMvpVote(groupId, matchId, voterPlayerId, votedPlayerId) {
    const votes = readVotes(groupId)
    if (votes.some((v) => v.matchId === matchId && v.voterPlayerId === voterPlayerId)) {
      throw new Error('Ya votaste en este partido')
    }
    const vote: MvpVote = {
      matchId,
      voterPlayerId,
      votedPlayerId,
      createdAt: new Date().toISOString(),
    }
    writeVotes(groupId, [...votes, vote])
    return vote
  },
}

export const matchStore: MatchStore = isCloudMode ? cloudStore : localStore
