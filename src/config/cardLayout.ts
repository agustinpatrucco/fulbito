import type { Club, Nacionalidad, Tier } from '../types'

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
  /** Club crest, top-left, drawn over the photo. Only shown when the player has one. */
  club: Box
  /** Flag, top-left below the club crest, drawn over the photo. */
  nacionalidad: Box
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

export const CLUB_BADGES: Record<Club, string> = {
  Barcelona: '/clubs/barcelona.png',
  'Boca Juniors': '/clubs/boca.png',
  Independiente: '/clubs/independiente.png',
  Racing: '/clubs/racing.png',
  'Real Madrid': '/clubs/realmadrid.png',
  'River Plate': '/clubs/riber.png',
  'San Lorenzo': '/clubs/sanlorenzo.png',
}

export const NACIONALIDAD_FLAGS: Record<Nacionalidad, string> = {
  Argentina: '/flags/Argentina.png',
  España: '/flags/Espana.png',
  Uruguay: '/flags/Uruguay.png',
}

const BASE: Omit<CardLayout, 'ink' | 'inkMuted' | 'accent'> = {
  // Shifted 10% right of the original `left: 18` to leave room for the club/
  // nacionalidad badges at the left margin.
  photo: { left: 26, top: 17.5, width: 64, height: 48 },
  name: { left: 8, top: 68, width: 84, height: 10 },
  positions: { left: 8, top: 80, width: 84, height: 9 },
  club: { left: 13, top: 15, width: 18, height: 30 },
  nacionalidad: { left: 14, top: 32, width: 16, height: 28 },
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
