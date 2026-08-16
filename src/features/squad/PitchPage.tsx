import { useMemo, useState } from 'react'
import type { TeamId, TeamSize } from '../../types'
import { getFormation } from '../../data/formations'
import { Button } from '../../components/ui'
import { Bench } from './Bench'
import { TeamPitch } from './TeamPitch'
import { ImportModal } from '../import/ImportModal'
import type { usePlayers } from '../players/usePlayers'
import { useSquad } from './useSquad'

const TEAM_LABELS: Record<TeamId, string> = { A: 'Equipo 1', B: 'Equipo 2' }

export function PitchPage({ roster }: { roster: ReturnType<typeof usePlayers> }) {
  const { players, byId, loading } = roster
  const squad = useSquad(byId)
  const [importing, setImporting] = useState(false)

  const bench = useMemo(
    () => players.filter((p) => p.active && !squad.assignedIds.has(p.id)),
    [players, squad.assignedIds],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-3 py-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              {([6, 7] as TeamSize[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => squad.setSize(n)}
                  className={`px-3 py-1.5 text-sm transition ${
                    squad.size === n
                      ? 'bg-emerald-500 font-bold text-black'
                      : 'text-white/60 hover:bg-white/10'
                  }`}
                >
                  {n} vs {n}
                </button>
              ))}
            </div>

            <Button className="ml-auto" onClick={() => setImporting(true)}>
              Pegar lista
            </Button>
          </div>

          {loading ? (
            <p className="py-16 text-center text-white/40">Cargando…</p>
          ) : players.length === 0 ? (
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
                  formation={getFormation(squad.squads[team].formationId)}
                  slots={squad.squads[team].slots}
                  byId={byId}
                  selectedId={squad.selectedId}
                  size={squad.size}
                  onSlotTap={(index) => squad.tapSlot(team, index)}
                  onPlayerTap={squad.tapPlayer}
                  onFormationChange={(id) => squad.setFormation(team, id)}
                  onClear={() => squad.clearTeam(team)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Bench
        players={bench}
        selectedId={squad.selectedId}
        onPlayerTap={squad.tapPlayer}
      />

      <ImportModal
        open={importing}
        onClose={() => setImporting(false)}
        roster={roster}
        onApply={(teams) => {
          squad.fillTeam('A', teams.A)
          squad.fillTeam('B', teams.B)
          setImporting(false)
        }}
      />
    </div>
  )
}
