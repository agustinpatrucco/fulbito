import { useState } from 'react'
import { Button, Field, Input } from './ui'
import { Modal } from './Modal'

type Props = {
  open: boolean
  onClose: () => void
  signIn: (password: string) => Promise<{ error: string | null }>
}

export function PasswordGate({ open, onClose, signIn }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const result = await signIn(password)
    setBusy(false)
    if (result.error) return setError(result.error)
    setPassword('')
    setError(null)
    onClose()
  }

  return (
    <Modal open={open} title="Modo edición" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-white/60">
          Ingresá la contraseña para poder agregar o editar jugadores. Solo hace falta una
          vez por dispositivo.
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
        <Button type="submit" variant="primary" className="w-full" disabled={busy || !password}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </Modal>
  )
}
