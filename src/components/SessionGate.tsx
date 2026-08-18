import { useState } from 'react'
import type { Player, PlayerDraft } from '../types'
import { displayName } from '../types'
import { Input } from './ui'
import { Modal } from './Modal'
import { PlayerCard } from '../features/players/PlayerCard'
import { PlayerForm } from '../features/players/PlayerForm'

type Props = {
  open: boolean
  onClose: () => void
  players: Player[]
  onSelectPlayer: (id: string) => void
  onCreatePlayer: (draft: PlayerDraft) => Promise<Player>
}

/**
 * Pick your own card — no password, that's the point. The very first player created
 * in a group becomes its admin (see `usePlayers.create`), so "+ Crear jugador" here is
 * also how a brand-new Grupo gets its first admin.
 */
export function SessionGate({ open, onClose, players, onSelectPlayer, onCreatePlayer }: Props) {
  const [mode, setMode] = useState<'pick' | 'create'>('pick')
  const [query, setQuery] = useState('')

  function close() {
    setMode('pick')
    setQuery('')
    onClose()
  }

  const filtered = players.filter((p) =>
    [p.name, p.nickname ?? '', ...p.aliases].some((s) =>
      s.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  )

  return (
    <Modal open={open} title={mode === 'pick' ? 'Elegí tu jugador' : 'Jugador nuevo'} onClose={close}>
      {mode === 'pick' ? (
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tu nombre…"
            autoFocus
          />

          {players.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/40">
              Todavía no hay jugadores en este grupo. Creá el primero.
            </p>
          ) : (
            <div className="grid max-h-80 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
              {filtered.map((p) => (
                <div key={p.id}>
                  <PlayerCard
                    player={p}
                    onClick={() => {
                      onSelectPlayer(p.id)
                      close()
                    }}
                  />
                  <p className="mt-1 truncate text-center text-xs text-white/40">
                    {displayName(p)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode('create')}
            className="text-xs text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
          >
            + Crear jugador
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMode('pick')}
            className="text-xs text-white/40 underline underline-offset-2 hover:text-white/70"
          >
            ‹ Volver
          </button>
          <PlayerForm
            onSave={async (draft) => {
              const player = await onCreatePlayer(draft)
              onSelectPlayer(player.id)
              return player
            }}
            onDone={close}
          />
        </div>
      )}
    </Modal>
  )
}
