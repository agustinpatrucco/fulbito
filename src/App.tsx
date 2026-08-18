import { useEffect, useMemo, useState } from 'react'
import { useGroup } from './lib/group'
import { usePlayerSession } from './lib/playerSession'
import { isCloudMode } from './lib/supabase'
import { SessionGate } from './components/SessionGate'
import { displayName } from './types'
import type { Group } from './types'
import { GroupLanding } from './features/group/GroupLanding'
import { usePlayers } from './features/players/usePlayers'
import { RosterPage } from './features/players/RosterPage'
import { MiPerfilPage } from './features/players/MiPerfilPage'
import { PitchPage } from './features/squad/PitchPage'
import { useMatches } from './features/matches/useMatches'
import { HistorialPage } from './features/matches/HistorialPage'

type Tab = 'partido' | 'historial' | 'plantel' | 'perfil'

const TAB_LABELS: Record<Tab, string> = {
  partido: 'Partido',
  historial: 'Historial',
  plantel: 'Plantel',
  perfil: 'Mi perfil',
}

export default function App() {
  const { group, status, notFoundCode, createGroup, joinByCode } = useGroup()

  if (status === 'loading') {
    return <p className="flex h-dvh items-center justify-center text-white/40">Cargando…</p>
  }

  if (status === 'landing' || status === 'not-found') {
    return <GroupLanding notFoundCode={notFoundCode} onCreate={createGroup} onJoin={joinByCode} />
  }

  return <GroupApp group={group!} />
}

function GroupApp({ group }: { group: Group }) {
  const [tab, setTab] = useState<Tab>('partido')
  const [gateOpen, setGateOpen] = useState(false)
  const roster = usePlayers(group.id)
  const playerSession = usePlayerSession(group.code, roster.players)
  const matches = useMatches(group.id, roster.byId)

  const sessionPlayer = playerSession.player
  const isAdmin = sessionPlayer?.isAdmin ?? false
  const canEdit = sessionPlayer !== null

  // Nobody's picked a player yet on this device — surface the gate right away instead
  // of waiting for someone to notice the "Iniciar sesión" button.
  useEffect(() => {
    if (!roster.loading && !sessionPlayer) setGateOpen(true)
  }, [roster.loading, sessionPlayer])

  const tabs: Tab[] =
    sessionPlayer !== null
      ? ['partido', 'historial', 'plantel', 'perfil']
      : ['partido', 'historial', 'plantel']

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
          {tabs.map((t) => (
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
          {canEdit && (
            <span className="hidden text-xs text-white/50 sm:block">
              {displayName(sessionPlayer)}
              {isAdmin && ' · admin'}
            </span>
          )}
          <button
            type="button"
            onClick={() => (canEdit ? playerSession.clearSession() : setGateOpen(true))}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60 hover:text-white"
          >
            {canEdit ? 'Salir' : 'Iniciar sesión'}
          </button>
        </div>
      </header>

      {tab === 'partido' && (
        <PitchPage
          roster={roster}
          matches={matches}
          canEdit={canEdit}
          sessionPlayerId={sessionPlayer?.id ?? null}
        />
      )}

      {tab === 'historial' && (
        <HistorialPage
          roster={roster}
          matches={matches}
          canEdit={canEdit}
          isAdmin={isAdmin}
          sessionPlayerId={sessionPlayer?.id ?? null}
        />
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

      {tab === 'perfil' && sessionPlayer && (
        <div className="flex-1 overflow-y-auto">
          <MiPerfilPage player={sessionPlayer} roster={roster} />
        </div>
      )}

      <SessionGate
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        players={roster.players}
        onSelectPlayer={playerSession.selectPlayer}
        onCreatePlayer={roster.create}
        onSetPassword={roster.setPassword}
      />
    </div>
  )
}
