import { useState } from 'react'
import { useAuth } from './lib/auth'
import { isCloudMode } from './lib/supabase'
import { PasswordGate } from './components/PasswordGate'
import { usePlayers } from './features/players/usePlayers'
import { RosterPage } from './features/players/RosterPage'
import { PitchPage } from './features/squad/PitchPage'

type Tab = 'partido' | 'plantel'

export default function App() {
  const [tab, setTab] = useState<Tab>('partido')
  const [gateOpen, setGateOpen] = useState(false)
  const { canEdit, ready, signIn, signOut } = useAuth()
  const roster = usePlayers()

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-lg font-black tracking-tight">
          fulbito<span className="text-emerald-400">.</span>
        </span>

        <nav className="ml-3 flex overflow-hidden rounded-lg border border-white/10">
          {(['partido', 'plantel'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm capitalize transition ${
                tab === t ? 'bg-white/15 font-semibold' : 'text-white/50 hover:bg-white/8'
              }`}
            >
              {t}
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
          {isCloudMode && ready && (
            <button
              type="button"
              onClick={() => (canEdit ? signOut() : setGateOpen(true))}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/60 hover:text-white"
            >
              {canEdit ? 'Salir' : 'Editar'}
            </button>
          )}
        </div>
      </header>

      {tab === 'partido' ? (
        <PitchPage roster={roster} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <RosterPage roster={roster} canEdit={canEdit} />
        </div>
      )}

      <PasswordGate open={gateOpen} onClose={() => setGateOpen(false)} signIn={signIn} />
    </div>
  )
}
