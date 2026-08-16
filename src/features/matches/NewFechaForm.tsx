import { useState } from 'react'
import { CANCHAS } from '../../types'
import type { Cancha, Match, MatchDraft, TeamSize } from '../../types'
import { Button, ChipGroup, Field, Input } from '../../components/ui'
import { errorMessage } from '../../lib/errors'
import { QUARTER_MINUTES } from './format'

type Mode = 'proxima' | 'anterior'
type QuarterMinute = (typeof QUARTER_MINUTES)[number]

type Props = {
  /** 'proxima' (default) only allows future kickoffs, for the next fecha to build on the
      pitch. 'anterior' only allows now-or-earlier, for backfilling a partido that already
      happened straight into Historial. */
  mode?: Mode
  onCreate: (draft: MatchDraft) => Promise<Match>
  onDone: (match: Match) => void
}

/** `input[type=date]` wants "YYYY-MM-DD" in local time. */
function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)

export function NewFechaForm({ mode = 'proxima', onCreate, onDone }: Props) {
  const [date, setDate] = useState('')
  const [hour, setHour] = useState('')
  const [minute, setMinute] = useState<QuarterMinute>(0)
  const [cancha, setCancha] = useState<Cancha>('Quintana')
  const [teamSize, setTeamSize] = useState<TeamSize>(6)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !hour) return setError('Elegí fecha y hora')

    const [year, month, day] = date.split('-').map(Number)
    // Built from separate fields rather than parsed from a single string, so there is no
    // ambiguity about local vs. UTC and no way to end up with an off-quarter minute.
    const picked = new Date(year, month - 1, day, Number(hour), minute)

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
      <Field label="Fecha">
        <Input
          type="date"
          value={date}
          min={mode === 'proxima' ? toDateInput(now) : undefined}
          max={mode === 'anterior' ? toDateInput(now) : undefined}
          onChange={(e) => setDate(e.target.value)}
          autoFocus
        />
      </Field>

      <Field label="Hora">
        <select
          value={hour}
          onChange={(e) => setHour(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm
            outline-none focus:border-emerald-400/60"
        >
          <option value="" disabled>
            — elegir —
          </option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, '0')} hs
            </option>
          ))}
        </select>
      </Field>

      <Field label="Minutos">
        <ChipGroup
          options={QUARTER_MINUTES}
          value={[minute]}
          onChange={([m]) => m !== undefined && setMinute(m)}
          renderLabel={(m) => String(m).padStart(2, '0')}
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
