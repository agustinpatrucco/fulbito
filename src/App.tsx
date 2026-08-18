import { useMemo, useState } from 'react'
import { useAuth } from './lib/auth'
import { usePlayerSession } from './lib/playerSession'
import { isCloudMode } from './lib/supabase'
import { SessionGate } from './components/SessionGate'
import { displayName } from './types'
import { usePlayers } from './features/players/usePlayers'
import { RosterPage } from './features/players/RosterPage'
import { PitchPage } from './features/squad/PitchPage'
import { useMatches } from './features/matches/useMatches'
import { HistorialPage } from './features/matches/HistorialPage'

type Tab = 'partido' | 'historial' | 'plantel'

const TAB_LABELS: Record<Tab, string> = {
  partido: 'Partido',
  historial: 'Historial',
  plantel: 'Plantel',
}

export default function App() {
  const [tab, setTab] = useState<Tab>('partido')
  const [gateOpen, setGateOpen] = useState(false)
  const admin = useAuth()
  const roster = usePlayers()
  const playerSession = usePlayerSession(roster.players)
  const matches = useMatches(roster.byId)

  const isAdmin = admin.canEdit
  const sessionPlayer = isAdmin ? null : playerSession.player
  const canEdit = isAdmin || sessionPlayer !== null

  function signOut() {
    admin.signOut()
    playerSession.clearSession()
  }

  const streaks = useMemo(
    () => new Map([...matches.stats].map(([id, s]) => [id, s.streak])),
    [matches.stats],
  )

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-lg font-black tracking-tight">
          fulbito<span className="text-emerald-400">.</span>
        </span>

        <nav className="ml-3 flex overflow-hidden rounded-lg border border-white/10">
          {(['partido', 'historial', 'plantel'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm transition ${
                tab === t ? 'bg-white/15 font-semibold' : 'text-white/50 hover:bg-white/8'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!isCloudMode && (
            <span
              className="hidden rounded bg-amber-400/15 px-2 py-1 text-[10px] font-semibold text-amber-200 sm:block"
              title="Sin conexión a Supabase: los datos se guardan solo en este navegador."
            >
              MODO LOCAL
            </span>
          )}
          {isCloudMode && admin.ready && (
            <>
              {canEdit && (
                <span className="hidden text-xs text-white/50 sm:block">
                  {isAdmin ? 'Admin' : displayName(sessionPlayer!)}
                </span>
              )}
              <button
                type="button"
                onClick={() => (canEdit ? signOut() : setGateOpen(true))}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60 hover:text-white"
              >
                {canEdit ? 'Salir' : 'Editar'}
              </button>
            </>
          )}
        </div>
      </header>

      {tab === 'partido' && <PitchPage roster={roster} matches={matches} canEdit={canEdit} />}

      {tab === 'historial' && (
        <HistorialPage roster={roster} matches={matches} canEdit={canEdit} isAdmin={isAdmin} />
      )}

      {tab === 'plantel' && (
        <div className="flex-1 overflow-y-auto">
          <RosterPage
            roster={roster}
            isAdmin={isAdmin}
            sessionPlayerId={sessionPlayer?.id ?? null}
            streaks={streaks}
          />
        </div>
      )}

      <SessionGate
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        players={roster.players}
        onSelectPlayer={playerSession.selectPlayer}
        signIn={admin.signIn}
      />
    </div>
  )
}
