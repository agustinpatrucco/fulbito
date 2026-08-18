import { useState } from 'react'
import type { Player } from '../types'
import { displayName } from '../types'
import { Button, Field, Input } from './ui'
import { Modal } from './Modal'
import { PlayerCard } from '../features/players/PlayerCard'

type Props = {
  open: boolean
  onClose: () => void
  players: Player[]
  onSelectPlayer: (id: string) => void
  signIn: (password: string) => Promise<{ error: string | null }>
}

/**
 * Two ways in: pick your own card (no password — that's the point), or the "¿Sos
 * admin?" link for the shared password. Same modal, so nobody has to know in advance
 * which one they need.
 */
export function SessionGate({ open, onClose, players, onSelectPlayer, signIn }: Props) {
  const [mode, setMode] = useState<'player' | 'admin'>('player')
  const [query, setQuery] = useState('')

  function close() {
    setMode('player')
    setQuery('')
    onClose()
  }

  const filtered = players.filter((p) =>
    [p.name, p.nickname ?? '', ...p.aliases].some((s) =>
      s.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  )

  return (
    <Modal open={open} title={mode === 'player' ? 'Elegí tu jugador' : 'Modo admin'} onClose={close}>
      {mode === 'player' ? (
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tu nombre…"
            autoFocus
          />

          {players.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/40">
              Todavía no hay jugadores cargados en Plantel.
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
            onClick={() => setMode('admin')}
            className="text-xs text-white/40 underline underline-offset-2 hover:text-white/70"
          >
            ¿Sos admin?
          </button>
        </div>
      ) : (
        <AdminForm signIn={signIn} onDone={close} onBack={() => setMode('player')} />
      )}
    </Modal>
  )
}

function AdminForm({
  signIn,
  onDone,
  onBack,
}: {
  signIn: (password: string) => Promise<{ error: string | null }>
  onDone: () => void
  onBack: () => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const result = await signIn(password)
    setBusy(false)
    if (result.error) return setError(result.error)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-white/60">
        Ingresá la contraseña de admin. Solo hace falta una vez por dispositivo.
      </p>
      <Field label="Contraseña">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
        />
      </Field>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={onBack} disabled={busy}>
          Volver
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          disabled={busy || !password}
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </div>
    </form>
  )
}
