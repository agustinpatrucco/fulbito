import type { Player } from '../../types'
import { PlayerCard } from '../players/PlayerCard'

type Props = {
  players: Player[]
  selectedId: string | null
  streaks?: Map<string, number>
  onPlayerTap: (playerId: string) => void
}

export function Bench({ players, selectedId, streaks, onPlayerTap }: Props) {
  return (
    <div className="border-t border-white/10 bg-black/40 px-3 py-2 backdrop-blur">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">
        {selectedId
          ? 'Tocá un puesto en la cancha'
          : `Disponibles (${players.length}) — tocá una carta`}
      </p>

      {players.length === 0 ? (
        <p className="py-3 text-center text-xs text-white/30">
          No queda nadie en el banco.
        </p>
      ) : (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {players.map((player) => (
            <div key={player.id} className="w-16 shrink-0">
              <PlayerCard
                player={player}
                selected={selectedId === player.id}
                streak={streaks?.get(player.id)}
                onClick={() => onPlayerTap(player.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
