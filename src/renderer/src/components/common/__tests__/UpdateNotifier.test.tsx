import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../../../../../test/test-utils'
import { UpdateNotifier } from '../UpdateNotifier'

const mocks = vi.hoisted(() => ({
  cleanupInitialize: vi.fn(),
  cleanupNotification: vi.fn(),
  initialize: vi.fn(),
  onUpdateAvailable: vi.fn(),
  openReleasePage: vi.fn(),
  skipVersion: vi.fn()
}))

vi.mock('@/stores/useUpdateStore', () => ({
  useUpdateStore: () => ({
    initialize: mocks.initialize,
    openReleasePage: mocks.openReleasePage,
    skippedVersion: null,
    skipVersion: mocks.skipVersion
  })
}))

describe('UpdateNotifier', () => {
  beforeEach(() => {
    mocks.initialize.mockReturnValue(mocks.cleanupInitialize)
    mocks.onUpdateAvailable.mockReturnValue(mocks.cleanupNotification)
    Object.assign(window.api, {
      update: { onUpdateAvailable: mocks.onUpdateAvailable }
    })
  })

  it('should clean up update listeners when unmounted', () => {
    const { unmount } = render(<UpdateNotifier />)

    expect(mocks.initialize).toHaveBeenCalledOnce()
    expect(mocks.onUpdateAvailable).toHaveBeenCalledOnce()

    unmount()

    expect(mocks.cleanupInitialize).toHaveBeenCalledOnce()
    expect(mocks.cleanupNotification).toHaveBeenCalledOnce()
  })
})
