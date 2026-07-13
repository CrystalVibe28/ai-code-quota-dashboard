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
    handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
      handlers.set(channel, handler)
    }),
    fromPartition: vi.fn(() => providerSession)
  }
})

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle },
  session: { fromPartition: mocks.fromPartition }
}))

vi.mock('../../services/storage', () => ({
  StorageService: class StorageService {
    deleteAccount = mocks.deleteAccount
  }
}))

vi.mock('../../services/providers/opencode-go', () => ({
  OPENCODE_GO_AUTH_PARTITION: 'persist:opencode-go-auth'
}))

import { registerStorageHandlers } from '../storage'

describe('storage:delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlers.clear()
    registerStorageHandlers()
  })

  it('should clear the provider session before deleting an Opencode Go account', async () => {
    const handler = mocks.handlers.get('storage:delete-account')
    expect(handler).toBeDefined()

    await handler?.({}, 'opencodeGo', 'account-id')

    expect(mocks.fromPartition).toHaveBeenCalledWith('persist:opencode-go-auth')
    expect(mocks.providerSession.clearStorageData).toHaveBeenCalledTimes(1)
    expect(mocks.providerSession.clearCache).toHaveBeenCalledTimes(1)
    expect(mocks.deleteAccount).toHaveBeenCalledWith('opencodeGo', 'account-id')
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
})
