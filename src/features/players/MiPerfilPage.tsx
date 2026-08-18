import type { Player } from '../../types'
import { PlayerForm } from './PlayerForm'
import type { usePlayers } from './usePlayers'

type Props = {
  player: Player
  roster: ReturnType<typeof usePlayers>
}

/** The same edit form Plantel opens for your own card, but as its own tab instead of a
    modal reached by scrolling past everyone else's. */
export function MiPerfilPage({ player, roster }: Props) {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-4">
      <PlayerForm key={player.id} player={player} onSave={(draft) => roster.update(player.id, draft)} onDone={() => {}} />
    </div>
  )
}
