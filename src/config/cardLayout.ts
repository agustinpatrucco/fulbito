import type { Tier } from '../types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  TUNE THE CARDS HERE.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every coordinate is a percentage of the card box, so nothing depends on pixel
 * size and the same numbers work at bench, pitch and full-screen scale.
 *
 * When you drop your real artwork into `public/cards/{gold,silver,bronze}.png`
 * the overlays will not line up on the first try. Nudge the numbers below until
 * they do — you should never need to touch PlayerCard.tsx to do it.
 */

export type Box = {
  /** % from the left edge of the card */
  left: number
  /** % from the top edge of the card */
  top: number
  width: number
  height: number
}

export type CardLayout = {
  /** Where the player's photo sits. */
  photo: Box
  /** The name bar. Text is centred inside it and shrinks to fit. */
  name: Box
  /** Row of position badges (POR / DFC / …). */
  positions: Box
  /** Colours for text drawn over the artwork. */
  ink: string
  inkMuted: string
  /** Fallback background, used until a PNG exists at the path below. */
  gradient: string
  /** Ring colour used for the selected state, per tier. */
  accent: string
}

/** Cards are 3:4. Change this and every size variant follows. */
export const CARD_ASPECT = 3 / 4

/** Drop your artwork at these paths — no code change needed. */
export const CARD_BACKGROUNDS: Record<Tier, string> = {
  gold: '/cards/gold.png',
  silver: '/cards/silver.png',
  bronze: '/cards/bronze.png',
}

const BASE: Omit<CardLayout, 'ink' | 'inkMuted' | 'gradient' | 'accent'> = {
  photo: { left: 18, top: 14, width: 64, height: 48 },
  name: { left: 8, top: 66, width: 84, height: 10 },
  positions: { left: 8, top: 78, width: 84, height: 9 },
}

export const CARD_LAYOUTS: Record<Tier, CardLayout> = {
  gold: {
    ...BASE,
    ink: '#3a2c05',
    inkMuted: '#6b5312',
    gradient: 'linear-gradient(160deg,#f7e08a 0%,#d8b34a 45%,#a8791f 100%)',
    accent: '#ffe89a',
  },
  silver: {
    ...BASE,
    ink: '#242a30',
    inkMuted: '#4d565f',
    gradient: 'linear-gradient(160deg,#eef1f4 0%,#b9c0c8 45%,#818b95 100%)',
    accent: '#e8eef4',
  },
  bronze: {
    ...BASE,
    ink: '#33200e',
    inkMuted: '#5e3d1d',
    gradient: 'linear-gradient(160deg,#e5b183 0%,#b1743f 45%,#7d4d22 100%)',
    accent: '#f0c49b',
  },
}

/** Turns a Box into inline styles. */
export function boxStyle(box: Box): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${box.left}%`,
    top: `${box.top}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  }
}
