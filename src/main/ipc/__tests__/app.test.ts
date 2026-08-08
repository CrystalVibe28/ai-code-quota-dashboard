import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, (...args: any[]) => any>()
  return {
    handlers,
    handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
      handlers.set(channel, handler)
    }),
    getAutoLaunch: vi.fn(),
    setAutoLaunch: vi.fn()
  }
})

vi.mock('electron', () => ({ ipcMain: { handle: mocks.handle } }))
vi.mock('../../services/storage', () => ({
  StorageService: class StorageService {}
}))
vi.mock('../../services/auto-launch', () => ({
  getAutoLaunch: mocks.getAutoLaunch,
  setAutoLaunch: mocks.setAutoLaunch
}))
vi.mock('../../index', () => ({
  restartBackgroundRefresh: vi.fn(),
  stopBackgroundRefresh: vi.fn(),
  startBackgroundRefresh: vi.fn()
}))

import { registerAppHandlers } from '../app'

describe('app auto launch IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlers.clear()
    registerAppHandlers()
  })

  it('rejects non-boolean auto-launch values', () => {
    const handler = mocks.handlers.get('app:set-auto-launch')

    expect(handler?.({}, 'true')).toBe(false)
    expect(mocks.setAutoLaunch).not.toHaveBeenCalled()
  })

  it('lets auto-launch read errors reach the renderer', () => {
    const error = new Error('read failed')
    mocks.getAutoLaunch.mockImplementation(() => { throw error })
    const handler = mocks.handlers.get('app:get-auto-launch')

    expect(() => handler?.({})).toThrow(error)
  })
})
