import type { Formation, Player, Slot, TeamId, TeamSize } from '../../types'
import { formationsForSize } from '../../data/formations'
import { PlayerCard } from '../players/PlayerCard'

type Props = {
  team: TeamId
  label: string
  formation: Formation
  slots: Slot[]
  byId: Map<string, Player>
  selectedId: string | null
  size: TeamSize
  streaks?: Map<string, number>
  locked?: boolean
  onSlotTap: (index: number) => void
  onPlayerTap: (playerId: string) => void
  onFormationChange: (formationId: string) => void
  onClear: () => void
}

export function TeamPitch({
  label,
  formation,
  slots,
  byId,
  selectedId,
  size,
  streaks,
  locked = false,
  onSlotTap,
  onPlayerTap,
  onFormationChange,
  onClear,
}: Props) {
  // The team attacks upward, so rows render front-to-back: forwards at the top of the
  // box, keeper at the bottom.
  const rows: Slot[][] = []
  let cursor = 0
  for (const row of formation.rows) {
    rows.push(slots.slice(cursor, cursor + row.count))
    cursor += row.count
  }
  rows.reverse()

  const filled = slots.filter((s) => s.playerId).length

  return (
    <section className="flex min-w-0 flex-col">
      <header className="mb-2 flex items-center gap-2">
        <h2 className="truncate text-sm font-bold uppercase tracking-wide">{label}</h2>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/50">
          {filled}/{slots.length}
        </span>
        {!locked && (
          <>
            <select
              value={formation.id}
              onChange={(e) => onFormationChange(e.target.value)}
              className="ml-auto rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs"
              aria-label={`Formación de ${label}`}
            >
              {formationsForSize(size).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/50 hover:text-white"
            >
              Vaciar
            </button>
          </>
        )}
        {locked && (
          <span className="ml-auto rounded bg-white/10 px-2 py-1 text-xs text-white/50">
            {formation.label}
          </span>
        )}
      </header>

      <div
        className="relative flex flex-col justify-between gap-1 rounded-xl border border-white/10 p-2"
        style={{
          background:
            'repeating-linear-gradient(0deg,var(--color-pitch) 0 6%,var(--color-pitch-dark) 6% 12%)',
        }}
      >
        <PitchMarkings />

        {rows.map((rowSlots, rowIndex) => (
          <div key={rowIndex} className="relative z-10 flex justify-evenly gap-1">
            {rowSlots.map((slot) => (
              <SlotView
                key={slot.index}
                slot={slot}
                player={slot.playerId ? byId.get(slot.playerId) : undefined}
                selectedId={selectedId}
                streak={slot.playerId ? streaks?.get(slot.playerId) : undefined}
                locked={locked}
                onSlotTap={onSlotTap}
                onPlayerTap={onPlayerTap}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function SlotView({
  slot,
  player,
  selectedId,
  streak,
  locked,
  onSlotTap,
  onPlayerTap,
}: {
  slot: Slot
  player: Player | undefined
  selectedId: string | null
  streak?: number
  locked: boolean
  onSlotTap: (index: number) => void
  onPlayerTap: (playerId: string) => void
}) {
  // Three across is the widest row any formation uses, so this keeps every row aligned.
  const width = 'w-[28%] max-w-24'

  if (!player) {
    if (locked) {
      return (
        <div
          className={`${width} flex items-center justify-center rounded-lg border-2 border-dashed
            border-white/15 bg-black/10 text-xs font-bold text-white/25`}
          style={{ aspectRatio: '3 / 4' }}
        >
          {slot.position}
        </div>
      )
    }
    return (
      <button
        type="button"
        onClick={() => onSlotTap(slot.index)}
        className={`${width} flex items-center justify-center rounded-lg border-2 border-dashed
          border-white/30 bg-black/15 text-xs font-bold text-white/50 transition
          hover:border-white/60 hover:bg-black/25 active:scale-95`}
        style={{ aspectRatio: '3 / 4' }}
      >
        {slot.position}
      </button>
    )
  }

  return (
    <div className={width}>
      <PlayerCard
        player={player}
        slotPosition={slot.position}
        selected={selectedId === player.id}
        streak={streak}
        // Tapping a placed card picks it up; tapping a slot then drops the pending card
        // there, swapping with whoever was in it. Locked matches are look-only.
        onClick={locked ? undefined : () => (selectedId ? onSlotTap(slot.index) : onPlayerTap(player.id))}
      />
    </div>
  )
}

/** Purely decorative; the team attacks toward the top, so the box sits at the bottom. */
function PitchMarkings() {
  return (
    <div className="pointer-events-none absolute inset-2 rounded-lg border-2 border-white/25">
      <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
      <div className="absolute bottom-0 left-1/2 h-[14%] w-[46%] -translate-x-1/2 border-2 border-b-0 border-white/25" />
      <div className="absolute bottom-0 left-1/2 h-[6%] w-[22%] -translate-x-1/2 border-2 border-b-0 border-white/25" />
    </div>
  )
}
