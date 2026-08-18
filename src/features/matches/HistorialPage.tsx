import { useMemo, useState } from 'react'
import type { Match, MvpVote as MvpVoteType, Player, Slot, TeamId } from '../../types'
import { canEnterResult, displayName, hasResult, isLocked, winnerOf } from '../../types'
import { Button } from '../../components/ui'
import { Modal } from '../../components/Modal'
import { ImportModal } from '../import/ImportModal'
import { formatFecha } from './format'
import { NewFechaForm } from './NewFechaForm'
import { ResultForm } from './ResultForm'
import { MvpVote } from './MvpVote'
import type { useMatches } from './useMatches'
import type { usePlayers } from '../players/usePlayers'

const TEAM_LABELS: Record<TeamId, string> = { A: 'Equipo 1', B: 'Equipo 2' }

type Props = {
  roster: ReturnType<typeof usePlayers>
  matches: ReturnType<typeof useMatches>
  canEdit: boolean
  /** Backfilling old partidos stays admin-only — everything else here is open to any
      logged-in player. */
  isAdmin: boolean
  sessionPlayerId: string | null
}

export function HistorialPage({ roster, matches, canEdit, isAdmin, sessionPlayerId }: Props) {
  const { byId } = roster
  const {
    matches: list,
    slotsByMatch,
    mvpVotesByMatch,
    stats,
    loading,
    setResult,
    fillMatchTeam,
    voteMvp,
  } = matches
  const lastMatchId = list[0]?.id ?? null
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [addingPast, setAddingPast] = useState(false)
  /** The match a "Pegar lista" is currently targeting — set right after creating a past
      partido, or by tapping the button on any existing row. */
  const [importingFor, setImportingFor] = useState<Match | null>(null)

  const record = useMemo(
    () =>
      [...stats.entries()]
        .map(([playerId, s]) => ({ playerId, player: byId.get(playerId), ...s }))
        .sort((a, b) => b.wins - a.wins),
    [stats, byId],
  )

  if (loading) {
    return <p className="flex-1 py-16 text-center text-white/40">Cargando…</p>
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-4">
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setAddingPast(true)}>+ Agregar partido anterior</Button>
        </div>
      )}

      {record.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-white/60">
            Récord por jugador
          </h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-left text-xs uppercase text-white/40">
                  <th className="px-3 py-2 font-semibold">Jugador</th>
                  <th className="px-2 py-2 text-center font-semibold">Victorias</th>
                  <th className="px-2 py-2 text-center font-semibold">Quintana</th>
                  <th className="px-2 py-2 text-center font-semibold">Complejo</th>
                  <th className="px-2 py-2 text-center font-semibold">MVP</th>
                </tr>
              </thead>
              <tbody>
                {record.map((r) => (
                  <tr key={r.playerId} className="border-t border-white/5">
                    <td className="px-3 py-2 font-medium">
                      {r.player ? displayName(r.player) : 'Jugador eliminado'}
                    </td>
                    <td className="px-2 py-2 text-center">{r.wins}</td>
                    <td className="px-2 py-2 text-center text-white/50">
                      {r.winsByCancha.Quintana}
                    </td>
                    <td className="px-2 py-2 text-center text-white/50">
                      {r.winsByCancha.Complejo}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {r.mvpCount > 0 ? (
                        <span className="text-amber-300">🏆{r.mvpCount}</span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-white/60">Fechas</h2>

      {list.length === 0 ? (
        <p className="py-10 text-center text-white/40">Todavía no se jugó ninguna fecha.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              slots={slotsByMatch.get(match.id) ?? { A: [], B: [] }}
              byId={byId}
              canEdit={canEdit}
              open={expanded.has(match.id)}
              onToggle={() =>
                setExpanded((prev) => {
                  const next = new Set(prev)
                  if (next.has(match.id)) {
                    next.delete(match.id)
                  } else {
                    next.add(match.id)
                  }
                  return next
                })
              }
              onSaveResult={(a, b) => setResult(match.id, a, b)}
              onImportLineup={() => setImportingFor(match)}
              isLastMatch={match.id === lastMatchId}
              sessionPlayerId={sessionPlayerId}
              votes={mvpVotesByMatch.get(match.id) ?? []}
              onVoteMvp={(votedPlayerId) => voteMvp(match.id, sessionPlayerId!, votedPlayerId)}
            />
          ))}
        </ul>
      )}

      <Modal open={addingPast} title="Agregar partido anterior" onClose={() => setAddingPast(false)}>
        <NewFechaForm
          mode="anterior"
          onCreate={matches.createMatch}
          onDone={(match) => {
            setAddingPast(false)
            setExpanded((prev) => new Set(prev).add(match.id))
            setImportingFor(match)
          }}
        />
      </Modal>

      <ImportModal
        open={importingFor !== null}
        onClose={() => setImportingFor(null)}
        roster={roster}
        onApply={(teams) => {
          if (!importingFor) return
          fillMatchTeam(importingFor.id, 'A', teams.A, importingFor.formationA)
          fillMatchTeam(importingFor.id, 'B', teams.B, importingFor.formationB)
          setImportingFor(null)
        }}
      />
    </div>
  )
}

function MatchRow({
  match,
  slots,
  byId,
  canEdit,
  open,
  onToggle,
  onSaveResult,
  onImportLineup,
  isLastMatch,
  sessionPlayerId,
  votes,
  onVoteMvp,
}: {
  match: Match
  slots: { A: Slot[]; B: Slot[] }
  byId: Map<string, Player>
  canEdit: boolean
  open: boolean
  onToggle: () => void
  onSaveResult: (scoreA: number, scoreB: number) => Promise<void>
  onImportLineup: () => void
  /** MVP voting only applies to the most recent Partido, never older history. */
  isLastMatch: boolean
  sessionPlayerId: string | null
  votes: MvpVoteType[]
  onVoteMvp: (votedPlayerId: string) => Promise<void>
}) {
  const locked = isLocked(match)
  const winner = winnerOf(match)

  return (
    <li className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{formatFecha(match.scheduledAt)}</p>
          <p className="text-xs text-white/40">{match.cancha}</p>
        </div>
        <ResultBadge match={match} locked={locked} winner={winner} />
        <span className="text-white/30">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-white/10 px-3 py-3">
          <div className="grid gap-4 sm:grid-cols-2">
            {(['A', 'B'] as TeamId[]).map((team) => (
              <div key={team}>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-white/50">
                  {TEAM_LABELS[team]}
                  {winner === team && ' 🏆'}
                </p>
                <ul className="space-y-0.5 text-sm">
                  {slots[team]
                    .filter((s) => s.playerId)
                    .map((s) => {
                      const player = s.playerId ? byId.get(s.playerId) : undefined
                      return (
                        <li key={s.index} className="flex gap-2 text-white/70">
                          <span className="w-8 shrink-0 text-white/30">{s.position}</span>
                          <span className="truncate">
                            {player ? displayName(player) : 'Jugador eliminado'}
                          </span>
                        </li>
                      )
                    })}
                  {slots[team].every((s) => !s.playerId) && (
                    <li className="text-white/30">Sin cargar</li>
                  )}
                </ul>
              </div>
            ))}
          </div>

          {locked && canEdit && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
              <Button onClick={onImportLineup}>Pegar lista</Button>
              <ResultForm match={match} onSave={onSaveResult} />
            </div>
          )}

          {isLastMatch && canEnterResult(match) && (
            <div className="mt-4 border-t border-white/10 pt-3">
              <MvpVote
                match={match}
                slots={slots}
                byId={byId}
                sessionPlayerId={sessionPlayerId}
                votes={votes}
                onVote={onVoteMvp}
              />
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function ResultBadge({
  match,
  locked,
  winner,
}: {
  match: Match
  locked: boolean
  winner: ReturnType<typeof winnerOf>
}) {
  if (hasResult(match)) {
    return (
      <span className="shrink-0 rounded bg-white/10 px-2 py-1 text-sm font-bold tabular-nums">
        {match.scoreA} – {match.scoreB}
        {winner === 'draw' && <span className="ml-1 font-normal text-white/40">(empate)</span>}
      </span>
    )
  }
  if (!locked) {
    return (
      <span className="shrink-0 rounded bg-emerald-400/15 px-2 py-1 text-xs font-semibold text-emerald-300">
        Próxima
      </span>
    )
  }
  return (
    <span className="shrink-0 rounded bg-amber-400/15 px-2 py-1 text-xs font-semibold text-amber-200">
      Sin resultado
    </span>
  )
}
