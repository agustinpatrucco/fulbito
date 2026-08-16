import { useState } from 'react'
import type { Match } from '../../types'
import { Button } from '../../components/ui'

type Props = {
  match: Match
  onSave: (scoreA: number, scoreB: number) => Promise<void>
  compact?: boolean
}

export function ResultForm({ match, onSave, compact = false }: Props) {
  const [scoreA, setScoreA] = useState(match.scoreA !== null ? String(match.scoreA) : '')
  const [scoreB, setScoreB] = useState(match.scoreB !== null ? String(match.scoreB) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const a = Number(scoreA)
    const b = Number(scoreB)
    if (scoreA === '' || scoreB === '' || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      return setError('Cargá un resultado válido para los dos equipos')
    }
    setBusy(true)
    setError(null)
    try {
      await onSave(a, b)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el resultado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={compact ? 'flex items-center gap-2' : 'space-y-3'}>
      {!compact && (
        <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
          Resultado final
        </p>
      )}
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/60">Equipo 1</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={scoreA}
          onChange={(e) => setScoreA(e.target.value)}
          className="w-14 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm outline-none focus:border-emerald-400/60"
        />
        <span className="text-white/30">–</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={scoreB}
          onChange={(e) => setScoreB(e.target.value)}
          className="w-14 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm outline-none focus:border-emerald-400/60"
        />
        <span className="text-sm text-white/60">Equipo 2</span>
      </div>
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? 'Guardando…' : match.scoreA !== null ? 'Corregir' : 'Guardar'}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  )
}
