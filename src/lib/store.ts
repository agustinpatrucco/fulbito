import type { Player, PlayerDraft } from '../types'
import { supabase, isCloudMode } from './supabase'

/**
 * One interface, two backends. Cloud mode talks to Supabase so the roster follows you
 * between phone and laptop; local mode keeps everything in localStorage so the app is
 * fully usable before a Supabase project is set up. Every method takes the active
 * group's id first — each group is a fully separate roster.
 */
export type PlayerStore = {
  list(groupId: string): Promise<Player[]>
  /** isAdmin is true only for the very first player created in an empty group. */
  create(groupId: string, draft: PlayerDraft, isAdmin: boolean): Promise<Player>
  update(groupId: string, id: string, patch: Partial<PlayerDraft>): Promise<Player>
  remove(groupId: string, id: string): Promise<void>
}

// --- row mapping ------------------------------------------------------------

type PlayerRow = {
  id: string
  name: string
  nickname: string | null
  aliases: string[] | null
  positions: string[]
  tier: string
  photo_url: string | null
  photo_path: string | null
  active: boolean
  created_at: string
  is_admin: boolean
}

function fromRow(row: PlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    aliases: row.aliases ?? [],
    positions: row.positions as Player['positions'],
    tier: row.tier as Player['tier'],
    photoUrl: row.photo_url,
    photoPath: row.photo_path,
    active: row.active,
    createdAt: row.created_at,
    isAdmin: row.is_admin,
  }
}

function toRow(draft: Partial<PlayerDraft>): Partial<PlayerRow> {
  const row: Partial<PlayerRow> = {}
  if (draft.name !== undefined) row.name = draft.name
  if (draft.nickname !== undefined) row.nickname = draft.nickname
  if (draft.aliases !== undefined) row.aliases = draft.aliases
  if (draft.positions !== undefined) row.positions = draft.positions
  if (draft.tier !== undefined) row.tier = draft.tier
  if (draft.photoUrl !== undefined) row.photo_url = draft.photoUrl
  if (draft.photoPath !== undefined) row.photo_path = draft.photoPath
  if (draft.active !== undefined) row.active = draft.active
  return row
}

// --- cloud ------------------------------------------------------------------

const cloudStore: PlayerStore = {
  async list(groupId) {
    const { data, error } = await supabase!
      .from('players')
      .select('*')
      .eq('group_id', groupId)
      .order('name', { ascending: true })
    if (error) throw error
    return (data as PlayerRow[]).map(fromRow)
  },

  async create(groupId, draft, isAdmin) {
    const { data, error } = await supabase!
      .from('players')
      .insert({ ...toRow(draft), group_id: groupId, is_admin: isAdmin })
      .select()
      .single()
    if (error) throw error
    return fromRow(data as PlayerRow)
  },

  async update(_groupId, id, patch) {
    const { data, error } = await supabase!
      .from('players')
      .update(toRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return fromRow(data as PlayerRow)
  },

  async remove(_groupId, id) {
    const { error } = await supabase!.from('players').delete().eq('id', id)
    if (error) throw error
  },
}

// --- local ------------------------------------------------------------------

const localKey = (groupId: string) => `fulbito.${groupId}.players.v1`

function readLocal(groupId: string): Player[] {
  try {
    const raw = localStorage.getItem(localKey(groupId))
    return raw ? (JSON.parse(raw) as Player[]) : []
  } catch {
    // A corrupt blob shouldn't brick the app; start over rather than crash on boot.
    return []
  }
}

function writeLocal(groupId: string, players: Player[]) {
  localStorage.setItem(localKey(groupId), JSON.stringify(players))
}

const localStore: PlayerStore = {
  async list(groupId) {
    return readLocal(groupId).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },

  async create(groupId, draft, isAdmin) {
    const player: Player = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isAdmin,
    }
    writeLocal(groupId, [...readLocal(groupId), player])
    return player
  },

  async update(groupId, id, patch) {
    const players = readLocal(groupId)
    const index = players.findIndex((p) => p.id === id)
    if (index === -1) throw new Error(`No existe el jugador ${id}`)
    players[index] = { ...players[index], ...patch }
    writeLocal(groupId, players)
    return players[index]
  },

  async remove(groupId, id) {
    writeLocal(groupId, readLocal(groupId).filter((p) => p.id !== id))
  },
}

export const playerStore: PlayerStore = isCloudMode ? cloudStore : localStore
