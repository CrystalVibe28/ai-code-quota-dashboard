import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../../../../../test/test-utils'
import { UpdateNotifier } from '../UpdateNotifier'

const mocks = vi.hoisted(() => ({
  cleanupInitialize: vi.fn(),
  initialize: vi.fn(),
  skipVersion: vi.fn(),
  startUpdate: vi.fn()
}))

vi.mock('@/stores/useUpdateStore', () => ({
  useUpdateStore: () => ({
    downloadState: 'idle',
    initialize: mocks.initialize,
    latestVersion: null,
    skippedVersion: null,
    skipVersion: mocks.skipVersion,
    startUpdate: mocks.startUpdate
  })
}))

describe('UpdateNotifier', () => {
  beforeEach(() => {
    mocks.initialize.mockReturnValue(mocks.cleanupInitialize)
  })

  it('should clean up update listeners when unmounted', () => {
    const { unmount } = render(<UpdateNotifier />)

    expect(mocks.initialize).toHaveBeenCalledOnce()

    unmount()

    expect(mocks.cleanupInitialize).toHaveBeenCalledOnce()
  })
})
