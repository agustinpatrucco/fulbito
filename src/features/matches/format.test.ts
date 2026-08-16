import { describe, expect, it } from 'vitest'
import { isQuarterHour } from './format'

describe('isQuarterHour', () => {
  it('accepts :00, :15, :30 and :45', () => {
    for (const minutes of [0, 15, 30, 45]) {
      expect(isQuarterHour(new Date(2026, 0, 1, 20, minutes))).toBe(true)
    }
  })

  it('rejects anything off the quarter hour', () => {
    for (const minutes of [1, 10, 29, 44, 59]) {
      expect(isQuarterHour(new Date(2026, 0, 1, 20, minutes))).toBe(false)
    }
  })
})
