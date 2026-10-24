import { describe, expect, it } from 'vitest'
import { isOllamaCloudSessionExpired } from '../ollamaCloudError'

describe('isOllamaCloudSessionExpired', () => {
  it('detects the expired session error from the main process', () => {
    expect(isOllamaCloudSessionExpired('Error: Ollama Cloud session expired; sign in again')).toBe(true)
  })

  it('ignores other errors', () => {
    expect(isOllamaCloudSessionExpired('Error: Failed to fetch Ollama Cloud usage: 500')).toBe(false)
    expect(isOllamaCloudSessionExpired('Usage unavailable')).toBe(false)
  })
})
