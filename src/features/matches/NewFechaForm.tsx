import { useState } from 'react'
import { CANCHAS } from '../../types'
import type { Cancha, MatchDraft, TeamSize } from '../../types'
import { Button, ChipGroup, Field, Input } from '../../components/ui'
import { errorMessage } from '../../lib/errors'

type Props = {
  onCreate: (draft: MatchDraft) => Promise<unknown>
  onDone: () => void
}

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time, no timezone suffix. */
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function NewFechaForm({ onCreate, onDone }: Props) {
  const [when, setWhen] = useState('')
  const [cancha, setCancha] = useState<Cancha>('Quintana')
  const [teamSize, setTeamSize] = useState<TeamSize>(6)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!when) return setError('Elegí fecha y hora')

    // A datetime-local string has no timezone, so `Date` reads it as local time —
    // exactly the wall-clock time the person picked in the field.
    const scheduledAt = new Date(when).toISOString()

    setBusy(true)
    setError(null)
    try {
      await onCreate({ scheduledAt, cancha, teamSize })
      onDone()
    } catch (e) {
      setError(errorMessage(e, 'No se pudo crear la fecha'))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Fecha y hora">
        <Input
          type="datetime-local"
          value={when}
          min={toDatetimeLocal(new Date())}
          onChange={(e) => setWhen(e.target.value)}
          autoFocus
        />
      </Field>

      <Field label="Cancha">
        <ChipGroup options={CANCHAS} value={[cancha]} onChange={([c]) => c && setCancha(c)} />
      </Field>

      <Field label="Cantidad de jugadores por equipo">
        <ChipGroup
          options={[6, 7] as const}
          value={[teamSize]}
          onChange={([n]) => n && setTeamSize(n)}
          renderLabel={(n) => `${n} vs ${n}`}
        />
      </Field>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" variant="primary" className="w-full" disabled={busy}>
        {busy ? 'Creando…' : 'Crear fecha'}
      </Button>
    </form>
  )
}
