import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, (...args: any[]) => any>()
  const rendererSession = {
    clearStorageData: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn().mockResolvedValue(undefined)
  }
  const providerSession = {
    clearStorageData: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn().mockResolvedValue(undefined)
  }

  return {
    handlers,
    rendererSession,
    providerSession,
    clearAllData: vi.fn(),
    verifyPassword: vi.fn(),
    changePassword: vi.fn(),
    beginPasswordChange: vi.fn(),
    commitPasswordChange: vi.fn(),
    rollbackPasswordChange: vi.fn(),
    reEncrypt: vi.fn(),
    unlock: vi.fn(),
    lock: vi.fn(),
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

vi.mock('../../services/crypto', () => ({
  CryptoService: class CryptoService {
    verifyPassword = mocks.verifyPassword
    changePassword = mocks.changePassword
    beginPasswordChange = mocks.beginPasswordChange
    commitPasswordChange = mocks.commitPasswordChange
    rollbackPasswordChange = mocks.rollbackPasswordChange
  }
}))

vi.mock('../../services/storage', () => ({
  StorageService: class StorageService {
    clearAllData = mocks.clearAllData
    reEncrypt = mocks.reEncrypt
    unlock = mocks.unlock
    lock = mocks.lock
  }
}))

vi.mock('../../services/providers/opencode-go', () => ({
  OPENCODE_GO_AUTH_PARTITION: 'persist:opencode-go-auth'
}))

import { registerAuthHandlers } from '../auth'

describe('auth:clear-all-data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlers.clear()
    registerAuthHandlers()
  })

  it('should delete app data and clear renderer and provider sessions', async () => {
    const handler = mocks.handlers.get('auth:clear-all-data')
    expect(handler).toBeDefined()

    await handler?.({ sender: { session: mocks.rendererSession } })

    expect(mocks.clearAllData).toHaveBeenCalledTimes(1)
    expect(mocks.fromPartition).toHaveBeenCalledWith('persist:opencode-go-auth')
    expect(mocks.rendererSession.clearStorageData).toHaveBeenCalledTimes(1)
    expect(mocks.rendererSession.clearCache).toHaveBeenCalledTimes(1)
    expect(mocks.providerSession.clearStorageData).toHaveBeenCalledTimes(1)
    expect(mocks.providerSession.clearCache).toHaveBeenCalledTimes(1)
    expect(mocks.clearAllData.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.providerSession.clearCache.mock.invocationCallOrder[0]
    )
  })

  it('should clear the provider session before locking', async () => {
    const handler = mocks.handlers.get('auth:lock')
    expect(handler).toBeDefined()

    await handler?.({})

    expect(mocks.fromPartition).toHaveBeenCalledWith('persist:opencode-go-auth')
    expect(mocks.providerSession.clearStorageData).toHaveBeenCalledTimes(1)
    expect(mocks.providerSession.clearCache).toHaveBeenCalledTimes(1)
    expect(mocks.lock).toHaveBeenCalledTimes(1)
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.providerSession.clearCache.mock.invocationCallOrder[0]
    )
  })

  it('should roll back both files when changing the auth file fails', async () => {
    const authError = new Error('auth write failed')
    mocks.verifyPassword.mockResolvedValueOnce(true)
    mocks.changePassword.mockRejectedValueOnce(authError)
    const handler = mocks.handlers.get('auth:change-password')

    await expect(handler?.({}, 'old-password', 'new-password')).rejects.toThrow(authError)

    expect(mocks.beginPasswordChange).toHaveBeenCalledTimes(1)
    expect(mocks.reEncrypt).toHaveBeenCalledWith('old-password', 'new-password')
    expect(mocks.rollbackPasswordChange).toHaveBeenCalledTimes(1)
    expect(mocks.unlock).toHaveBeenCalledWith('old-password')
    expect(mocks.commitPasswordChange).not.toHaveBeenCalled()
  })
})
