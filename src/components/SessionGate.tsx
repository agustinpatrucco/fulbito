import { useState } from 'react'
import type { Player, PlayerDraft } from '../types'
import { displayName } from '../types'
import { hashPassword, randomSalt } from '../lib/passwordHash'
import { errorMessage } from '../lib/errors'
import { Button, Field, Input } from './ui'
import { Modal } from './Modal'
import { PlayerCard } from '../features/players/PlayerCard'
import { PlayerForm } from '../features/players/PlayerForm'

type Props = {
  open: boolean
  onClose: () => void
  players: Player[]
  onSelectPlayer: (id: string) => void
  onCreatePlayer: (draft: PlayerDraft) => Promise<Player>
  onSetPassword: (id: string, passwordHash: string, passwordSalt: string) => Promise<Player>
}

type Mode = 'pick' | 'create' | 'set-password' | 'enter-password'

const TITLES: Record<Mode, string> = {
  pick: 'Elegí tu jugador',
  create: 'Jugador nuevo',
  'set-password': 'Elegí una contraseña',
  'enter-password': 'Ingresá tu contraseña',
}

/**
 * Pick your own card — no admin gate for that, that's the point. The very first player
 * created in a group becomes its admin (see `usePlayers.create`), so "+ Crear jugador"
 * here is also how a brand-new Grupo gets its first admin.
 *
 * A password only exists to stop someone from picking a friend's card instead of their
 * own — the first time anyone ever picks a given player (or right after creating one),
 * they're asked to set it; every login as that player after that needs it. Once picked,
 * the session persists per device as before, so this only comes up when switching who
 * you are on a device, not on every visit.
 */
export function SessionGate({
  open,
  onClose,
  players,
  onSelectPlayer,
  onCreatePlayer,
  onSetPassword,
}: Props) {
  const [mode, setMode] = useState<Mode>('pick')
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<Player | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function close() {
    setMode('pick')
    setQuery('')
    setPending(null)
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setBusy(false)
    onClose()
  }

  function pick(player: Player) {
    setPending(player)
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setMode(player.passwordHash ? 'enter-password' : 'set-password')
  }

  async function submitSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 4) return setError('La contraseña debe tener al menos 4 caracteres')
    if (password !== confirmPassword) return setError('Las contraseñas no coinciden')

    setBusy(true)
    setError(null)
    try {
      const salt = randomSalt()
      const hash = await hashPassword(password, salt)
      await onSetPassword(pending!.id, hash, salt)
      onSelectPlayer(pending!.id)
      close()
    } catch (e) {
      setError(errorMessage(e, 'No se pudo guardar la contraseña'))
      setBusy(false)
    }
  }

  async function submitEnterPassword(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const hash = await hashPassword(password, pending!.passwordSalt!)
      if (hash !== pending!.passwordHash) {
        setError('Contraseña incorrecta')
        setBusy(false)
        return
      }
      onSelectPlayer(pending!.id)
      close()
    } catch (e) {
      setError(errorMessage(e, 'No se pudo verificar la contraseña'))
      setBusy(false)
    }
  }

  const filtered = players.filter((p) =>
    [p.name, p.nickname ?? '', ...p.aliases].some((s) =>
      s.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  )

  return (
    <Modal open={open} title={TITLES[mode]} onClose={close}>
      {mode === 'pick' && (
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
                  <PlayerCard player={p} onClick={() => pick(p)} />
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
      )}

      {mode === 'create' && (
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
              setPending(player)
              setPassword('')
              setConfirmPassword('')
              setError(null)
              setMode('set-password')
              return player
            }}
            onDone={() => {}}
          />
        </div>
      )}

      {mode === 'set-password' && pending && (
        <form onSubmit={submitSetPassword} className="space-y-3">
          <p className="text-sm text-white/60">
            Primera vez que entrás como <strong>{displayName(pending)}</strong>. Elegí una
            contraseña — te la va a pedir la próxima vez que quieras entrar como{' '}
            {displayName(pending)} desde otro dispositivo o sesión.
          </p>
          <Field label="Contraseña">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="new-password"
            />
          </Field>
          <Field label="Repetir contraseña">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" onClick={() => setMode('pick')} disabled={busy}>
              Volver
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={busy}>
              {busy ? 'Guardando…' : 'Crear contraseña y entrar'}
            </Button>
          </div>
        </form>
      )}

      {mode === 'enter-password' && pending && (
        <form onSubmit={submitEnterPassword} className="space-y-3">
          <p className="text-sm text-white/60">
            Ingresá la contraseña de <strong>{displayName(pending)}</strong>.
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
            <Button type="button" onClick={() => setMode('pick')} disabled={busy}>
              Volver
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={busy || !password}>
              {busy ? 'Entrando…' : 'Entrar'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
