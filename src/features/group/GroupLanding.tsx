import { useState } from 'react'
import { Button, Field, Input } from '../../components/ui'

type Props = {
  notFoundCode?: string | null
  onCreate: () => Promise<void>
  onJoin: (code: string) => Promise<void>
}

/** The very first thing anyone sees with no group in the URL: create a fresh Grupo, or
    join one you already have the 6-character code for. Also doubles as the "that code
    doesn't exist" screen — same choices, plus an inline error. */
export function GroupLanding({ notFoundCode, onCreate, onJoin }: Props) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      await onCreate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el grupo')
      setBusy(false)
    }
  }

  async function submitJoin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    await onJoin(code)
    setBusy(false)
  }

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="text-2xl font-black tracking-tight">
        fulbito<span className="text-emerald-400">.</span>
      </span>

      {notFoundCode && (
        <p className="max-w-xs text-sm text-red-400">
          El código “{notFoundCode}” no existe. Probá de nuevo o creá un grupo nuevo.
        </p>
      )}

      <Button variant="primary" onClick={handleCreate} disabled={busy}>
        Crear grupo nuevo
      </Button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <p className="text-xs uppercase tracking-wide text-white/30">o</p>

      <form onSubmit={submitJoin} className="w-full max-w-xs space-y-2">
        <Field label="Unite con un código">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            placeholder="ej: consti"
            maxLength={6}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={busy || code.trim().length !== 6}>
          Unirme
        </Button>
      </form>
    </div>
  )
}
