import { useState } from 'react'
import { CANCHAS } from '../../types'
import type { Cancha, Match, MatchDraft, TeamSize } from '../../types'
import { Button, ChipGroup, Field, Input } from '../../components/ui'
import { errorMessage } from '../../lib/errors'
import { isQuarterHour } from './format'

type Mode = 'proxima' | 'anterior'

type Props = {
  /** 'proxima' (default) only allows future kickoffs, for the next fecha to build on the
      pitch. 'anterior' only allows now-or-earlier, for backfilling a partido that already
      happened straight into Historial. */
  mode?: Mode
  onCreate: (draft: MatchDraft) => Promise<Match>
  onDone: (match: Match) => void
}

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time, no timezone suffix. */
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function NewFechaForm({ mode = 'proxima', onCreate, onDone }: Props) {
  const [when, setWhen] = useState('')
  const [cancha, setCancha] = useState<Cancha>('Quintana')
  const [teamSize, setTeamSize] = useState<TeamSize>(6)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!when) return setError('Elegí fecha y hora')

    // A datetime-local string has no timezone, so `Date` reads it as local time —
    // exactly the wall-clock time the person picked in the field.
    const picked = new Date(when)

    if (!isQuarterHour(picked)) {
      return setError('Los minutos deben ser 00, 15, 30 o 45')
    }
    if (mode === 'anterior' && picked.getTime() > Date.now()) {
      return setError('Un partido anterior no puede tener fecha futura')
    }
    if (mode === 'proxima' && picked.getTime() < Date.now()) {
      return setError('Elegí un horario que todavía no pasó')
    }

    setBusy(true)
    setError(null)
    try {
      const match = await onCreate({ scheduledAt: picked.toISOString(), cancha, teamSize })
      onDone(match)
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
          // The step only nudges the native spinner to quarter-hours — typed input is
          // still checked on submit, since browsers don't all enforce it while typing.
          step={900}
          min={mode === 'proxima' ? toDatetimeLocal(now) : undefined}
          max={mode === 'anterior' ? toDatetimeLocal(now) : undefined}
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
        {busy ? 'Creando…' : mode === 'anterior' ? 'Agregar partido' : 'Crear fecha'}
      </Button>
    </form>
  )
}
