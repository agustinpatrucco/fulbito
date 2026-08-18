import { useMemo, useState } from 'react'
import type { TeamId } from '../../types'
import { canEnterResult, hasResult, isLocked } from '../../types'
import { getFormation } from '../../data/formations'
import { Button } from '../../components/ui'
import { Modal } from '../../components/Modal'
import { Bench } from './Bench'
import { TeamPitch } from './TeamPitch'
import { ImportModal } from '../import/ImportModal'
import { NewFechaForm } from '../matches/NewFechaForm'
import { ResultForm } from '../matches/ResultForm'
import { MvpVote } from '../matches/MvpVote'
import { formatFecha } from '../matches/format'
import type { usePlayers } from '../players/usePlayers'
import type { useMatches } from '../matches/useMatches'

const TEAM_LABELS: Record<TeamId, string> = { A: 'Equipo 1', B: 'Equipo 2' }

type Props = {
  roster: ReturnType<typeof usePlayers>
  matches: ReturnType<typeof useMatches>
  canEdit: boolean
  sessionPlayerId: string | null
}

export function PitchPage({ roster, matches, canEdit, sessionPlayerId }: Props) {
  const { players, byId } = roster
  const { currentMatch, loading, slots, mvpVotesByMatch, stats, selectedId, assignedIds } =
    matches
  const [importing, setImporting] = useState(false)
  const [creatingFecha, setCreatingFecha] = useState(false)

  const streaks = useMemo(() => new Map([...stats].map(([id, s]) => [id, s.streak])), [stats])

  const bench = useMemo(
    () => players.filter((p) => p.active && !assignedIds.has(p.id)),
    [players, assignedIds],
  )

  if (loading) {
    return <p className="flex-1 py-16 text-center text-white/40">Cargando…</p>
  }

  // No fecha at all yet — nothing to show but the "create one" flow. Once a fecha
  // exists, the squads stay visible here even after kickoff (read-only); only player
  // swapping gets blocked, further down.
  if (!currentMatch) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-white/40">Todavía no hay ninguna fecha creada.</p>

        {canEdit ? (
          <Button variant="primary" onClick={() => setCreatingFecha(true)}>
            Crear fecha
          </Button>
        ) : (
          <p className="text-sm text-white/30">Iniciá sesión para crear la próxima fecha.</p>
        )}

        <Modal open={creatingFecha} title="Nueva fecha" onClose={() => setCreatingFecha(false)}>
          <NewFechaForm onCreate={matches.createMatch} onDone={() => setCreatingFecha(false)} />
        </Modal>
      </div>
    )
  }

  const swapLocked = isLocked(currentMatch)
  const resultOpen = canEnterResult(currentMatch)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-3 py-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div>
              <p className="text-sm font-bold">{formatFecha(currentMatch.scheduledAt)}</p>
              <p className="text-xs text-white/40">
                {currentMatch.cancha} · {currentMatch.teamSize} vs {currentMatch.teamSize}
              </p>
            </div>

            {resultOpen && !hasResult(currentMatch) && canEdit && (
              <div className="mx-auto">
                <ResultForm
                  match={currentMatch}
                  minimal
                  onSave={(a, b) => matches.setResult(currentMatch.id, a, b)}
                />
              </div>
            )}

            {canEdit && !swapLocked && (
              <Button className="ml-auto" onClick={() => setImporting(true)}>
                Pegar lista
              </Button>
            )}
          </div>

          {players.length === 0 ? (
            <p className="py-16 text-center text-white/40">
              Agregá jugadores en la pestaña Plantel para armar los equipos.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {(['A', 'B'] as TeamId[]).map((team) => (
                <TeamPitch
                  key={team}
                  team={team}
                  label={TEAM_LABELS[team]}
                  formation={getFormation(
                    team === 'A' ? currentMatch.formationA : currentMatch.formationB,
                  )}
                  slots={slots[team]}
                  byId={byId}
                  selectedId={selectedId}
                  size={currentMatch.teamSize}
                  streaks={streaks}
                  locked={swapLocked || !canEdit}
                  onSlotTap={(index) => matches.tapSlot(team, index)}
                  onPlayerTap={matches.tapPlayer}
                  onFormationChange={(id) => matches.setFormation(team, id)}
                  onClear={() => matches.clearTeam(team)}
                />
              ))}
            </div>
          )}

          {resultOpen && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <MvpVote
                match={currentMatch}
                slots={slots}
                byId={byId}
                sessionPlayerId={sessionPlayerId}
                votes={mvpVotesByMatch.get(currentMatch.id) ?? []}
                onVote={(votedPlayerId) =>
                  matches.voteMvp(currentMatch.id, sessionPlayerId!, votedPlayerId)
                }
              />
            </div>
          )}
        </div>
      </div>

      {canEdit && !swapLocked && (
        <Bench
          players={bench}
          selectedId={selectedId}
          streaks={streaks}
          onPlayerTap={matches.tapPlayer}
        />
      )}

      <ImportModal
        open={importing}
        onClose={() => setImporting(false)}
        roster={roster}
        onApply={(teams) => {
          matches.fillTeam('A', teams.A)
          matches.fillTeam('B', teams.B)
          setImporting(false)
        }}
      />
    </div>
  )
}
