import type { Tier } from '../types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  TUNE THE CARDS HERE.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every coordinate is a percentage of the card box, so nothing depends on pixel
 * size and the same numbers work at bench, pitch and full-screen scale.
 *
 * The overlays are tuned against `public/cards/{gold,silver,bronze}.png`. If that
 * artwork changes, nudge the numbers below to match — you should never need to touch
 * PlayerCard.tsx to do it.
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

const BASE: Omit<CardLayout, 'ink' | 'inkMuted' | 'accent'> = {
  photo: { left: 18, top: 14, width: 64, height: 48 },
  name: { left: 8, top: 66, width: 84, height: 10 },
  positions: { left: 8, top: 78, width: 84, height: 9 },
}

export const CARD_LAYOUTS: Record<Tier, CardLayout> = {
  gold: {
    ...BASE,
    ink: '#3a2c05',
    inkMuted: '#6b5312',
    accent: '#ffe89a',
  },
  silver: {
    ...BASE,
    ink: '#242a30',
    inkMuted: '#4d565f',
    accent: '#e8eef4',
  },
  bronze: {
    ...BASE,
    ink: '#33200e',
    inkMuted: '#5e3d1d',
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
