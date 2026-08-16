import { useMemo, useState } from 'react'
import type { Player, TeamId } from '../../types'
import { displayName } from '../../types'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/ui'
import { PlayerForm } from '../players/PlayerForm'
import type { usePlayers } from '../players/usePlayers'
import { parseTeamList } from './parseTeamList'
import { matchPlayers, type MatchResult } from './matchPlayers'

type Props = {
  open: boolean
  onClose: () => void
  roster: ReturnType<typeof usePlayers>
  onApply: (teams: Record<TeamId, Player[]>) => void
}

const PLACEHOLDER = `EQUIPO 1
- Nico
- Juanchi
- Fede

EQUIPO 2
- Agus
- Tomi
- Santi`

type Row = MatchResult & { team: TeamId; key: string }

export function ImportModal({ open, onClose, roster, onApply }: Props) {
  const { players, create, update } = roster
  const [text, setText] = useState('')
  /** Manual corrections, keyed by row. Overrides whatever the matcher decided. */
  const [overrides, setOverrides] = useState<Record<string, string | null>>({})
  const [creatingFor, setCreatingFor] = useState<Row | null>(null)

  const rows: Row[] = useMemo(() => {
    if (!text.trim()) return []
    const parsed = parseTeamList(text)
    // Match against the whole paste at once so no player can land in both teams.
    const all = [...parsed.A, ...parsed.B]
    const results = matchPlayers(all, players)
    return results.map((result, i) => ({
      ...result,
      team: i < parsed.A.length ? 'A' : 'B',
      key: `${i}-${result.entry}`,
    }))
  }, [text, players])

  const guessed = useMemo(
    () => (text.trim() ? parseTeamList(text).guessed : false),
    [text],
  )

  function resolve(row: Row): Player | null {
    const override = overrides[row.key]
    if (override === null) return null
    if (override) return players.find((p) => p.id === override) ?? null
    return row.player
  }

  /** A player already claimed by another row shouldn't be offered again. */
  const claimed = new Set(
    rows.map((row) => resolve(row)?.id).filter((id): id is string => Boolean(id)),
  )

  const resolvedCount = rows.filter((row) => resolve(row)).length
  const unresolved = rows.length - resolvedCount

  async function handleCreated(row: Row, player: Player) {
    setOverrides((prev) => ({ ...prev, [row.key]: player.id }))
    setCreatingFor(null)
  }

  /**
   * When the user corrects a match, remember the spelling that fooled us. Next time the
   * same list is pasted it resolves on its own.
   */
  async function rememberAlias(row: Row, player: Player) {
    const entry = row.entry.trim()
    const known = [player.name, player.nickname ?? '', ...player.aliases]
    if (!entry || known.some((k) => k.toLowerCase() === entry.toLowerCase())) return
    await update(player.id, { aliases: [...player.aliases, entry] }).catch(() => {})
  }

  async function apply() {
    const teams: Record<TeamId, Player[]> = { A: [], B: [] }
    for (const row of rows) {
      const player = resolve(row)
      if (!player) continue
      teams[row.team].push(player)
      if (overrides[row.key]) await rememberAlias(row, player)
    }
    onApply(teams)
    setText('')
    setOverrides({})
  }

  return (
    <>
      <Modal open={open} title="Pegar lista de equipos" onClose={onClose} wide>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={7}
          className="w-full rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-sm
            outline-none placeholder:text-white/20 focus:border-emerald-400/60"
        />

        {rows.length > 0 && (
          <>
            {guessed && (
              <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                No encontré los títulos “EQUIPO 1 / EQUIPO 2”, así que dividí la lista por
                la mitad. Revisá que los equipos estén bien.
              </p>
            )}

            <div className="mt-3 space-y-4">
              {(['A', 'B'] as TeamId[]).map((team) => {
                const teamRows = rows.filter((r) => r.team === team)
                if (teamRows.length === 0) return null
                return (
                  <div key={team}>
                    <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-white/50">
                      {team === 'A' ? 'Equipo 1' : 'Equipo 2'} ({teamRows.length})
                    </h3>
                    <ul className="space-y-1">
                      {teamRows.map((row) => (
                        <RowView
                          key={row.key}
                          row={row}
                          resolved={resolve(row)}
                          players={players}
                          claimed={claimed}
                          onPick={(id) =>
                            setOverrides((prev) => ({ ...prev, [row.key]: id }))
                          }
                          onCreate={() => setCreatingFor(row)}
                        />
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-3">
              <p className="text-xs text-white/50">
                {resolvedCount} de {rows.length} identificados
                {unresolved > 0 && ` · ${unresolved} se omitirán`}
              </p>
              <Button
                variant="primary"
                className="ml-auto"
                onClick={apply}
                disabled={resolvedCount === 0}
              >
                Armar equipos
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={creatingFor !== null}
        title={`Nuevo jugador: ${creatingFor?.entry ?? ''}`}
        onClose={() => setCreatingFor(null)}
      >
        {creatingFor && (
          <PlayerForm
            initialName={creatingFor.entry}
            onSave={async (draft) => {
              const player = await create(draft)
              await handleCreated(creatingFor, player)
              return player
            }}
            onDone={() => setCreatingFor(null)}
          />
        )}
      </Modal>
    </>
  )
}

function RowView({
  row,
  resolved,
  players,
  claimed,
  onPick,
  onCreate,
}: {
  row: Row
  resolved: Player | null
  players: Player[]
  claimed: Set<string>
  onPick: (id: string | null) => void
  onCreate: () => void
}) {
  const badge = !resolved
    ? { text: 'sin identificar', className: 'bg-red-500/20 text-red-300' }
    : row.confidence === 'suggested'
      ? { text: '¿es este?', className: 'bg-amber-400/20 text-amber-200' }
      : { text: 'ok', className: 'bg-emerald-400/20 text-emerald-200' }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
      <span className="min-w-24 flex-1 truncate font-mono text-sm text-white/80">
        {row.entry}
      </span>
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.className}`}>
        {badge.text}
      </span>
      <select
        value={resolved?.id ?? ''}
        onChange={(e) => onPick(e.target.value || null)}
        className="min-w-36 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm"
        aria-label={`Jugador para ${row.entry}`}
      >
        <option value="">— omitir —</option>
        {players
          // Keep the current pick listed even though it's claimed by this very row.
          .filter((p) => !claimed.has(p.id) || p.id === resolved?.id)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {displayName(p)}
              {p.nickname ? ` (${p.name})` : ''}
            </option>
          ))}
      </select>
      {!resolved && (
        <button
          type="button"
          onClick={onCreate}
          className="rounded-lg border border-emerald-400/40 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-400/10"
        >
          Crear
        </button>
      )}
    </li>
  )
}
