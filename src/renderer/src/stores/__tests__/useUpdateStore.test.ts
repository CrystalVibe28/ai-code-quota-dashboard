import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UpdateDownloadStatus } from '@shared/types/update'
import { mockWindowApi } from '../../../../test/mocks/window-api'
import { useUpdateStore } from '../useUpdateStore'

describe('useUpdateStore', () => {
  beforeEach(() => {
    useUpdateStore.setState(useUpdateStore.getInitialState(), true)
    vi.clearAllMocks()
  })

  it('should install only after the downloaded status arrives', async () => {
    let statusListener: ((status: UpdateDownloadStatus) => void) | undefined
    const cleanupAvailable = vi.fn()
    const cleanupStatus = vi.fn()

    mockWindowApi.update.onUpdateAvailable.mockReturnValue(cleanupAvailable)
    mockWindowApi.update.onStatusChange.mockImplementation((listener) => {
      statusListener = listener
      return cleanupStatus
    })

    const cleanup = useUpdateStore.getState().initialize()
    statusListener?.({ state: 'downloaded', percent: 100, version: '2.0.0' })

    expect(useUpdateStore.getState()).toMatchObject({
      downloadState: 'downloaded',
      downloadProgress: 100,
      latestVersion: '2.0.0',
      hasUpdate: true
    })

    await useUpdateStore.getState().startUpdate()

    expect(mockWindowApi.update.install).toHaveBeenCalledOnce()

    cleanup()
    expect(cleanupAvailable).toHaveBeenCalledOnce()
    expect(cleanupStatus).toHaveBeenCalledOnce()
  })
})
