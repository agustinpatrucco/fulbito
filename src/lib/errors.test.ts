import { describe, expect, it } from 'vitest'
import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('reads the message off a native Error', () => {
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('reads the message off a Supabase-shaped plain object', () => {
    // What PostgREST/Storage/Auth actually throw: not an Error instance.
    const supabaseError = {
      message: "Could not find the 'cancha' column of 'matches' in the schema cache",
      details: null,
      hint: null,
      code: 'PGRST204',
    }
    expect(errorMessage(supabaseError, 'fallback')).toBe(supabaseError.message)
  })

  it('falls back when there is nothing usable', () => {
    expect(errorMessage('a bare string', 'fallback')).toBe('fallback')
    expect(errorMessage(null, 'fallback')).toBe('fallback')
    expect(errorMessage(undefined, 'fallback')).toBe('fallback')
    expect(errorMessage({}, 'fallback')).toBe('fallback')
  })

  it('falls back when message exists but is not a string', () => {
    expect(errorMessage({ message: 42 }, 'fallback')).toBe('fallback')
  })
})
