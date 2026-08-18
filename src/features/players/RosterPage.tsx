import { useMemo, useState } from 'react'
import type { Player } from '../../types'
import { displayName } from '../../types'
import { Button, Input } from '../../components/ui'
import { Modal } from '../../components/Modal'
import { PlayerCard } from './PlayerCard'
import { PlayerForm } from './PlayerForm'
import type { usePlayers } from './usePlayers'

type Props = {
  roster: ReturnType<typeof usePlayers>
  /** Full access: create/delete anyone, edit any card. */
  isAdmin: boolean
  /** A player-session user may edit only this one card. */
  sessionPlayerId: string | null
  streaks?: Map<string, number>
}

export function RosterPage({ roster, isAdmin, sessionPlayerId, streaks }: Props) {
  const { players, loading, error, create, update, remove } = roster
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Player | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return players
    return players.filter((p) =>
      [p.name, p.nickname ?? '', ...p.aliases].some((s) => s.toLowerCase().includes(q)),
    )
  }, [players, query])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4">
      <div className="mb-4 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar jugador…"
        />
        {isAdmin && (
          <Button variant="primary" className="shrink-0" onClick={() => setCreating(true)}>
            + Jugador
          </Button>
        )}
      </div>

      {loading && <p className="py-10 text-center text-white/40">Cargando plantel…</p>}
      {error && <p className="py-10 text-center text-red-400">{error}</p>}

      {!loading && filtered.length === 0 && (
        <div className="py-16 text-center text-white/40">
          {players.length === 0 ? (
            <>
              <p className="text-lg">Todavía no hay jugadores.</p>
              {isAdmin && <p className="mt-1 text-sm">Agregá al primero con “+ Jugador”.</p>}
            </>
          ) : (
            <p>Nadie coincide con “{query}”.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {filtered.map((player) => {
          const canEditThis = isAdmin || player.id === sessionPlayerId
          return (
            <div key={player.id}>
              <PlayerCard
                player={player}
                streak={streaks?.get(player.id)}
                onClick={canEditThis ? () => setEditing(player) : undefined}
              />
              <p className="mt-1 truncate text-center text-xs text-white/40">
                {player.nickname ? player.name : displayName(player)}
              </p>
            </div>
          )
        })}
      </div>

      {isAdmin && (
        <Modal open={creating} title="Nuevo jugador" onClose={() => setCreating(false)}>
          <PlayerForm onSave={create} onDone={() => setCreating(false)} />
        </Modal>
      )}

      <Modal
        open={editing !== null}
        title={editing?.id === sessionPlayerId ? 'Tu carta' : 'Editar jugador'}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <PlayerForm
            key={editing.id}
            player={editing}
            onSave={(draft) => update(editing.id, draft)}
            onDelete={isAdmin ? () => remove(editing.id) : undefined}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
