import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../../../test/test-utils'
import { Settings } from '../Settings'
import { useAuthStore } from '../../stores/useAuthStore'
import { mockWindowApi } from '../../../../test/mocks/window-api'

vi.mock('@/components/settings/UpdateSettings', () => ({ UpdateSettings: () => null }))

describe('Settings', () => {
  beforeEach(() => {
    useAuthStore.setState(useAuthStore.getInitialState(), true)
    vi.clearAllMocks()
  })

  it('should run the destructive clear-data action after confirmation', async () => {
    const clearAllData = vi.fn().mockResolvedValue(true)
    useAuthStore.setState({ clearAllData })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<Settings />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear All Data' }))

    await waitFor(() => {
      expect(clearAllData).toHaveBeenCalledTimes(1)
    })
    expect(mockWindowApi.auth.lock).not.toHaveBeenCalled()
  })
})
