import type { Player, Position } from '../../types'
import { displayName, isOutOfPosition } from '../../types'
import {
  CARD_BACKGROUNDS,
  CARD_LAYOUTS,
  CLUB_BADGES,
  NACIONALIDAD_FLAGS,
  boxStyle,
} from '../../config/cardLayout'

type Props = {
  player: Player
  /** When set, the card is sitting in a pitch slot and gets a red ring if it can't play there. */
  slotPosition?: Position
  selected?: boolean
  onClick?: () => void
  className?: string
  /** Consecutive wins. Only rendered at MIN_STREAK_TO_SHOW or above — the caller already
      filtered, this component just draws whatever number it's handed. */
  streak?: number
}

/**
 * The card fills its container and holds a 3:4 aspect ratio; the parent decides how big
 * it is. All text is sized in `cqw` so a bench card and a pitch card are the same design
 * at different scales rather than two hand-tuned layouts.
 */
export function PlayerCard({
  player,
  slotPosition,
  selected = false,
  onClick,
  className = '',
  streak = 0,
}: Props) {
  const layout = CARD_LAYOUTS[player.tier]
  const misplaced = slotPosition ? isOutOfPosition(player, slotPosition) : false
  const name = displayName(player)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={misplaced ? `${name} juega de ${player.positions.join('/')}` : name}
      className={`relative block w-full overflow-hidden rounded-[8%] transition
        disabled:cursor-default ${onClick ? 'active:scale-95 cursor-pointer' : ''}
        ${className}`}
      style={{
        aspectRatio: '3 / 4',
        containerType: 'inline-size',
        backgroundImage: `url('${CARD_BACKGROUNDS[player.tier]}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Photo */}
      <div style={boxStyle(layout.photo)} className="overflow-hidden">
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt=""
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-black opacity-30"
            style={{ fontSize: '22cqw', color: layout.ink }}
          >
            {initials(name)}
          </div>
        )}
      </div>

      {/* Club crest and flag, drawn over the photo at the left margin — club on top. */}
      {player.club && (
        <div style={boxStyle(layout.club)}>
          <img src={CLUB_BADGES[player.club]} alt="" className="h-full w-full object-contain" />
        </div>
      )}
      {player.nacionalidad && (
        <div style={boxStyle(layout.nacionalidad)}>
          <img
            src={NACIONALIDAD_FLAGS[player.nacionalidad]}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
      )}

      {/* Name */}
      <div
        style={{ ...boxStyle(layout.name), color: layout.ink }}
        className="flex items-center justify-center"
      >
        <span
          className="w-full truncate text-center font-extrabold uppercase leading-none tracking-tight"
          style={{ fontSize: '11cqw' }}
        >
          {name}
        </span>
      </div>

      {/* Positions */}
      <div
        style={boxStyle(layout.positions)}
        className="flex items-center justify-center gap-[3%]"
      >
        {player.positions.map((pos) => {
          const isSlot = slotPosition === pos
          return (
            <span
              key={pos}
              className="rounded px-[4%] font-bold leading-tight"
              style={{
                fontSize: '8cqw',
                color: isSlot ? layout.accent : layout.ink,
                background: isSlot ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.28)',
              }}
            >
              {pos}
            </span>
          )
        })}
      </div>

      {/* Out-of-position warning — advisory, never blocking.
          Both overlays draw their ring with a single inline box-shadow: the card clips
          its overflow, so an outer ring would be invisible, and a Tailwind `ring-*`
          would be silently overwritten by any inline box-shadow anyway. */}
      {misplaced && (
        <span
          className="pointer-events-none absolute inset-0 rounded-[8%]"
          style={{
            boxShadow: 'inset 0 0 0 3px #ef4444, inset 0 0 12px 3px rgba(239,68,68,.5)',
          }}
        />
      )}

      {selected && (
        <span
          className="pointer-events-none absolute inset-0 rounded-[8%]"
          style={{
            boxShadow: `inset 0 0 0 3px ${layout.accent}, inset 0 0 14px 3px ${layout.accent}80`,
          }}
        />
      )}

      {!player.active && (
        <span className="pointer-events-none absolute inset-0 rounded-[8%] bg-black/55" />
      )}

      {streak >= 2 && (
        <span
          title={`${streak} victorias seguidas`}
          className="pointer-events-none absolute right-[4%] top-[4%] flex items-center gap-[2%]
            rounded-full bg-black/70 px-[6%] font-bold text-orange-300"
          style={{ fontSize: '9cqw', lineHeight: '1.8' }}
        >
          🔥{streak}
        </span>
      )}
    </button>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}
