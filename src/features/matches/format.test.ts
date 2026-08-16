import { describe, expect, it } from 'vitest'
import { QUARTER_MINUTES } from './format'

describe('QUARTER_MINUTES', () => {
  it('is exactly the four quarter-hour marks, in order', () => {
    expect(QUARTER_MINUTES).toEqual([0, 15, 30, 45])
  })
})
