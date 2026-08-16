import { describe, expect, it } from 'vitest'
import { cleanEntry, parseTeamList } from './parseTeamList'

describe('parseTeamList', () => {
  it('splits on EQUIPO headers', () => {
    const result = parseTeamList(`EQUIPO 1
- Nico
- Juanchi
- Fede

EQUIPO 2
- Agus
- Tomi
- Santi`)

    expect(result.A).toEqual(['Nico', 'Juanchi', 'Fede'])
    expect(result.B).toEqual(['Agus', 'Tomi', 'Santi'])
    expect(result.guessed).toBe(false)
  })

  it('accepts TEAM A / TEAM B and mixed case headers', () => {
    const result = parseTeamList(`team a\n1. Nico\nTeam B\n2. Agus`)
    expect(result.A).toEqual(['Nico'])
    expect(result.B).toEqual(['Agus'])
  })

  it('handles the various bullet styles people paste', () => {
    const result = parseTeamList(`EQUIPO 1\n• Nico\n* Juanchi\n1) Fede\n2 - Tomi\nSanti`)
    expect(result.A).toEqual(['Nico', 'Juanchi', 'Fede', 'Tomi', 'Santi'])
  })

  it('strips notes, emoji and position tags but keeps the name', () => {
    expect(cleanEntry('- Nico (arquero)')).toBe('Nico')
    expect(cleanEntry('- Fede ✅')).toBe('Fede')
    expect(cleanEntry('- Juan Pérez - POR')).toBe('Juan Pérez')
    expect(cleanEntry('- Agustín ?')).toBe('Agustín')
  })

  it('keeps hyphenated surnames intact', () => {
    expect(cleanEntry('- Ana Sánchez-Gómez')).toBe('Ana Sánchez-Gómez')
  })

  it('splits an even headerless list down the middle', () => {
    const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']
    const result = parseTeamList(names.map((n) => `- ${n}`).join('\n'))
    expect(result.A).toHaveLength(6)
    expect(result.B).toHaveLength(6)
    expect(result.guessed).toBe(true)
  })

  it('puts an odd headerless list in team 1 rather than guessing badly', () => {
    const result = parseTeamList('- Nico\n- Agus\n- Fede')
    expect(result.A).toHaveLength(3)
    expect(result.B).toEqual([])
    expect(result.guessed).toBe(true)
  })

  it('assigns entries appearing before the first header to team 1', () => {
    const result = parseTeamList(`- Nico\nEQUIPO 2\n- Agus`)
    expect(result.A).toEqual(['Nico'])
    expect(result.B).toEqual(['Agus'])
  })

  it('ignores blank lines and returns empty teams for empty input', () => {
    expect(parseTeamList('\n\n   \n')).toEqual({ A: [], B: [], guessed: true })
  })
})
