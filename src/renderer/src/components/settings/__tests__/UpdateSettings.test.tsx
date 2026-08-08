import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '../../../../../test/test-utils'
import { mockWindowApi } from '../../../../../test/mocks/window-api'
import { useUpdateStore } from '@/stores/useUpdateStore'
import { UpdateSettings } from '../UpdateSettings'

describe('UpdateSettings', () => {
  beforeEach(() => {
    useUpdateStore.setState(useUpdateStore.getInitialState(), true)
    vi.clearAllMocks()
  })

  it('checks for updates immediately when an update is required', async () => {
    const updateInfo = {
      currentVersion: '1.0.0',
      latestVersion: '2.0.0',
      hasUpdate: true,
      releaseUrl: 'https://example.com/releases/2.0.0'
    }
    mockWindowApi.update.check.mockResolvedValue({ success: true, data: updateInfo })
    mockWindowApi.update.getLastUpdateInfo.mockResolvedValue(updateInfo)

    render(<UpdateSettings required />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    await waitFor(() => expect(mockWindowApi.update.check).toHaveBeenCalledOnce())
    await waitFor(() => expect(useUpdateStore.getState().hasUpdate).toBe(true))
  })
})
