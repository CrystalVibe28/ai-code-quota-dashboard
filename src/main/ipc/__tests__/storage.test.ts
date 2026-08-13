import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, (...args: any[]) => any>()
  const providerSession = {
    clearStorageData: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn().mockResolvedValue(undefined)
  }

  return {
    handlers,
    providerSession,
    deleteAccount: vi.fn().mockResolvedValue(true),
    deleteHistory: vi.fn().mockReturnValue(true),
    getHistory: vi.fn().mockReturnValue({
      weekly: [],
      monthly: [],
      audit: { provider: [], account: [] }
    }),
    handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
      handlers.set(channel, handler)
    }),
    fromPartition: vi.fn(() => providerSession),
    saveSettings: vi.fn().mockResolvedValue(true),
    restartLocalApi: vi.fn().mockResolvedValue(undefined)
  }
})

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle },
  session: { fromPartition: mocks.fromPartition }
}))

vi.mock('../../services/storage', () => ({
  StorageService: class StorageService {
    deleteAccount = mocks.deleteAccount
    saveSettings = mocks.saveSettings
  }
}))

vi.mock('../../services/providers/opencode-go', () => ({
  OPENCODE_GO_AUTH_PARTITION: 'persist:opencode-go-auth'
}))

vi.mock('../../services/usage-data', () => ({
  UsageDataService: {
    getInstance: () => ({
      deleteAccount: mocks.deleteHistory,
      getQuotaHistory: mocks.getHistory
    })
  }
}))

vi.mock('../../services/providers/ollama-cloud', () => ({
  OLLAMA_CLOUD_AUTH_PARTITION: 'persist:ollama-cloud-auth'
}))

import { registerStorageHandlers } from '../storage'

describe('storage:delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlers.clear()
    registerStorageHandlers(mocks.restartLocalApi)
  })

  it('should clear the provider session before deleting an Opencode Go account', async () => {
    const handler = mocks.handlers.get('storage:delete-account')
    expect(handler).toBeDefined()

    await handler?.({}, 'opencodeGo', 'account-id')

    expect(mocks.fromPartition).toHaveBeenCalledWith('persist:opencode-go-auth')
    expect(mocks.providerSession.clearStorageData).toHaveBeenCalledTimes(1)
    expect(mocks.providerSession.clearCache).toHaveBeenCalledTimes(1)
    expect(mocks.deleteAccount).toHaveBeenCalledWith('opencodeGo', 'account-id')
    expect(mocks.deleteHistory).toHaveBeenCalledWith('opencodeGo', 'account-id')
    expect(mocks.deleteAccount.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.providerSession.clearCache.mock.invocationCallOrder[0]
    )
  })

  it('should not clear the provider session when deleting another provider', async () => {
    const handler = mocks.handlers.get('storage:delete-account')

    await handler?.({}, 'codex', 'account-id')

    expect(mocks.fromPartition).not.toHaveBeenCalled()
    expect(mocks.deleteAccount).toHaveBeenCalledWith('codex', 'account-id')
  })

  it('should clear the Ollama Cloud session before deleting the account', async () => {
    const handler = mocks.handlers.get('storage:delete-account')

    await handler?.({}, 'ollamaCloud', 'account-id')

    expect(mocks.fromPartition).toHaveBeenCalledWith('persist:ollama-cloud-auth')
    expect(mocks.deleteAccount).toHaveBeenCalledWith('ollamaCloud', 'account-id')
  })

  it('should reject an empty account id before clearing or deleting data', async () => {
    const handler = mocks.handlers.get('storage:delete-account')

    await expect(handler?.({}, 'opencodeGo', '')).resolves.toBe(false)

    expect(mocks.fromPartition).not.toHaveBeenCalled()
    expect(mocks.deleteAccount).not.toHaveBeenCalled()
    expect(mocks.deleteHistory).not.toHaveBeenCalled()
  })

  it('should report a history cleanup failure', async () => {
    const handler = mocks.handlers.get('storage:delete-account')
    mocks.deleteHistory.mockReturnValueOnce(false)

    await expect(handler?.({}, 'codex', 'account-id')).resolves.toBe(false)
  })

  it('should return quota history without calling a provider', async () => {
    const handler = mocks.handlers.get('storage:get-quota-history')

    await handler?.({}, 'codex', 'account-id')

    expect(mocks.getHistory).toHaveBeenCalledWith('codex', 'account-id')
  })

  it('should rebind the local API after saving its access setting', async () => {
    const handler = mocks.handlers.get('storage:save-settings')

    await handler?.({}, { allowRemoteApiAccess: true })

    expect(mocks.saveSettings).toHaveBeenCalledWith({ allowRemoteApiAccess: true })
    expect(mocks.restartLocalApi).toHaveBeenCalledTimes(1)
    expect(mocks.restartLocalApi.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.saveSettings.mock.invocationCallOrder[0]
    )
  })
})
