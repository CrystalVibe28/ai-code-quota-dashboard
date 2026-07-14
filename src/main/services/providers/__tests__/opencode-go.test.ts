import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const authSession = {
    clearStorageData: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn().mockResolvedValue(undefined),
    cookies: { get: vi.fn().mockResolvedValue([]) }
  }
  const authWindow = {
    webContents: {
      getURL: vi.fn(() => ''),
      executeJavaScript: vi.fn().mockResolvedValue([]),
      setWindowOpenHandler: vi.fn(),
      on: vi.fn()
    },
    loadURL: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    isDestroyed: vi.fn(() => false),
    close: vi.fn()
  }

  return {
    authSession,
    authWindow,
    BrowserWindow: vi.fn(function BrowserWindow() { return authWindow }),
    fromPartition: vi.fn(() => authSession)
  }
})

vi.mock('electron', () => ({
  BrowserWindow: mocks.BrowserWindow,
  session: { fromPartition: mocks.fromPartition }
}))

import { OpencodeGoService, OPENCODE_GO_AUTH_PARTITION } from '../opencode-go'

describe('OpencodeGoService.login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should clear the persisted auth session before opening the login page', async () => {
    const service = new OpencodeGoService()
    const loginPromise = service.login()

    await vi.waitFor(() => {
      expect(mocks.authWindow.loadURL).toHaveBeenCalledWith('https://opencode.ai/auth')
    })

    expect(mocks.fromPartition).toHaveBeenCalledWith(OPENCODE_GO_AUTH_PARTITION)
    expect(mocks.authSession.clearStorageData).toHaveBeenCalledTimes(1)
    expect(mocks.authSession.clearCache).toHaveBeenCalledTimes(1)
    expect(mocks.authWindow.loadURL.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.authSession.clearStorageData.mock.invocationCallOrder[0]
    )
    expect(mocks.authWindow.loadURL.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.authSession.clearCache.mock.invocationCallOrder[0]
    )

    service.cancelLogin()
    await loginPromise
  })
})
