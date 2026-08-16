import type { Player, PlayerDraft } from '../types'
import { supabase, isCloudMode } from './supabase'

/**
 * One interface, two backends. Cloud mode talks to Supabase so the roster follows you
 * between phone and laptop; local mode keeps everything in localStorage so the app is
 * fully usable before a Supabase project is set up.
 */
export type PlayerStore = {
  list(): Promise<Player[]>
  create(draft: PlayerDraft): Promise<Player>
  update(id: string, patch: Partial<PlayerDraft>): Promise<Player>
  remove(id: string): Promise<void>
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
  async list() {
    const { data, error } = await supabase!
      .from('players')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    return (data as PlayerRow[]).map(fromRow)
  },

  async create(draft) {
    const { data, error } = await supabase!
      .from('players')
      .insert(toRow(draft))
      .select()
      .single()
    if (error) throw error
    return fromRow(data as PlayerRow)
  },

  async update(id, patch) {
    const { data, error } = await supabase!
      .from('players')
      .update(toRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return fromRow(data as PlayerRow)
  },

  async remove(id) {
    const { error } = await supabase!.from('players').delete().eq('id', id)
    if (error) throw error
  },
}

// --- local ------------------------------------------------------------------

const LOCAL_KEY = 'fulbito.players.v1'

function readLocal(): Player[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as Player[]) : []
  } catch {
    // A corrupt blob shouldn't brick the app; start over rather than crash on boot.
    return []
  }
}

function writeLocal(players: Player[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(players))
}

const localStore: PlayerStore = {
  async list() {
    return readLocal().sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },

  async create(draft) {
    const player: Player = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    writeLocal([...readLocal(), player])
    return player
  },

  async update(id, patch) {
    const players = readLocal()
    const index = players.findIndex((p) => p.id === id)
    if (index === -1) throw new Error(`No existe el jugador ${id}`)
    players[index] = { ...players[index], ...patch }
    writeLocal(players)
    return players[index]
  },

  async remove(id) {
    writeLocal(readLocal().filter((p) => p.id !== id))
  },
}

export const playerStore: PlayerStore = isCloudMode ? cloudStore : localStore
