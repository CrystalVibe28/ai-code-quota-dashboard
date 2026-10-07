import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOpencodeGoStore } from '../useOpencodeGoStore'
import { mockWindowApi } from '../../../../test/mocks/window-api'

beforeEach(() => {
  vi.clearAllMocks()
  useOpencodeGoStore.getState().reset()
  mockWindowApi.opencodeGo.validateApiKey.mockResolvedValue({ valid: true })
  mockWindowApi.storage.saveAccount.mockResolvedValue(true)
  mockWindowApi.storage.updateAccount.mockResolvedValue(true)
})

describe('OpenCode Go API-key accounts', () => {
  it('validates and saves a trimmed key without a cookie or login token', async () => {
    const result = await useOpencodeGoStore.getState().addAccount('My Go', ' test-key ')
    expect(result.success).toBe(true)
    expect(mockWindowApi.opencodeGo.validateApiKey).toHaveBeenCalledWith('test-key')
    expect(mockWindowApi.storage.saveAccount).toHaveBeenCalledWith('opencodeGo', {
      id: expect.any(String), displayName: 'My Go', apiKey: 'test-key', showInOverview: true
    })
  })

  it('updates a legacy account in place and refreshes quota', async () => {
    expect(await useOpencodeGoStore.getState().setApiKey('old-id', 'new-key')).toEqual({ success: true })
    expect(mockWindowApi.storage.updateAccount).toHaveBeenCalledWith('opencodeGo', 'old-id', { apiKey: 'new-key' })
    expect(mockWindowApi.storage.saveAccount).not.toHaveBeenCalled()
    expect(mockWindowApi.opencodeGo.fetchAllUsage).toHaveBeenCalled()
  })

  it('does not save rejected keys', async () => {
    mockWindowApi.opencodeGo.validateApiKey.mockResolvedValue({ valid: false, error: 'subscription required' })
    expect(await useOpencodeGoStore.getState().addAccount('Go', 'bad')).toEqual({ success: false, error: 'subscription required' })
    expect(mockWindowApi.storage.saveAccount).not.toHaveBeenCalled()
  })

  it('does not report success when persistence fails', async () => {
    mockWindowApi.storage.saveAccount.mockResolvedValue(false)
    expect((await useOpencodeGoStore.getState().addAccount('Go', 'key')).success).toBe(false)
  })
})
