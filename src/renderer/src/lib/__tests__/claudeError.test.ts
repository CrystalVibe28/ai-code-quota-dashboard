import { describe, expect, it } from 'vitest'
import { isClaudeSignInRequired } from '../claudeError'

describe('isClaudeSignInRequired', () => {
  it('detects the sign-in errors from the main process', () => {
    expect(isClaudeSignInRequired('Claude sign-in required. Add the Claude account again to sign in.')).toBe(true)
    expect(isClaudeSignInRequired('Error: Claude sign-in was rejected (401). Add the Claude account again to sign in.')).toBe(true)
    expect(isClaudeSignInRequired('Claude sign-in lacks the user:profile scope. Add the Claude account again to sign in.')).toBe(true)
  })

  it('ignores other errors', () => {
    expect(isClaudeSignInRequired('Claude usage request failed: 500')).toBe(false)
    expect(isClaudeSignInRequired('TypeError: fetch failed')).toBe(false)
  })
})
