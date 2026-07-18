import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, (...args: any[]) => any>()
  return {
    handlers,
    constructors: [] as Array<[string | undefined, string | undefined]>,
    handle: vi.fn((channel: string, handler: (...args: any[]) => any) => handlers.set(channel, handler)),
    getCredentials: vi.fn(),
    hasCredentials: vi.fn().mockResolvedValue(false),
    saveCredentials: vi.fn().mockResolvedValue(true),
    deleteCredentials: vi.fn().mockResolvedValue(true),
    getAccounts: vi.fn().mockResolvedValue([]),
    updateAccount: vi.fn().mockResolvedValue(true),
    login: vi.fn().mockResolvedValue({ success: true, account: { userId: 'user-1' } }),
    cancelLogin: vi.fn().mockReturnValue(true),
    refreshToken: vi.fn().mockResolvedValue(null),
    fetchUsage: vi.fn()
  }
})

vi.mock('electron', () => ({ ipcMain: { handle: mocks.handle } }))

vi.mock('../../services/storage', () => ({
  StorageService: class StorageService {
    getAiStudioOAuthCredentials = mocks.getCredentials
    hasAiStudioOAuthCredentials = mocks.hasCredentials
    saveAiStudioOAuthCredentials = mocks.saveCredentials
    deleteAiStudioOAuthCredentials = mocks.deleteCredentials
    getAccounts = mocks.getAccounts
    updateAccount = mocks.updateAccount
  }
}))

vi.mock('../../services/providers/ai-studio', () => ({
  AiStudioService: class AiStudioService {
    constructor(clientId?: string, clientSecret?: string) {
      mocks.constructors.push([clientId, clientSecret])
    }

    login = mocks.login
    cancelLogin = mocks.cancelLogin
    refreshToken = mocks.refreshToken
    fetchUsage = mocks.fetchUsage
  }
}))

import { registerAiStudioHandlers } from '../ai-studio'

describe('AI Studio OAuth credential IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlers.clear()
    mocks.constructors.length = 0
    mocks.getCredentials.mockReturnValue(null)
    registerAiStudioHandlers()
  })

  it('never exposes credential values and rejects invalid save input', async () => {
    expect(mocks.handlers.has('ai-studio:get-oauth-credentials')).toBe(false)

    const save = mocks.handlers.get('ai-studio:save-oauth-credentials')
    expect(await save?.({}, null, 'secret')).toBe(false)
    expect(mocks.saveCredentials).not.toHaveBeenCalled()

    expect(await save?.({}, 'client-id', 'client-secret')).toBe(true)
    expect(mocks.saveCredentials).toHaveBeenCalledWith('client-id', 'client-secret')
  })

  it('reads the encrypted runtime credentials for each login', async () => {
    const login = mocks.handlers.get('ai-studio:login')

    await expect(login?.({})).resolves.toEqual({
      success: false,
      error: 'Google OAuth client is not configured'
    })
    expect(mocks.constructors).toHaveLength(0)

    mocks.getCredentials.mockReturnValue({ clientId: 'runtime-id', clientSecret: 'runtime-secret' })
    await expect(login?.({})).resolves.toMatchObject({ success: true })
    expect(mocks.constructors).toEqual([['runtime-id', 'runtime-secret']])
  })
})
