import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../../../test/test-utils'
import { Settings } from '../Settings'
import { useAuthStore } from '../../stores/useAuthStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { mockWindowApi } from '../../../../test/mocks/window-api'

vi.mock('@/components/settings/UpdateSettings', () => ({ UpdateSettings: () => null }))

describe('Settings', () => {
  beforeEach(() => {
    useAuthStore.setState(useAuthStore.getInitialState(), true)
    useSettingsStore.setState(useSettingsStore.getInitialState(), true)
    vi.clearAllMocks()
  })

  it('should save threshold fields only after editing finishes', async () => {
    render(<Settings />)

    const nameInput = screen.getAllByLabelText('Name')[0]
    fireEvent.change(nameInput, { target: { value: 'W' } })
    fireEvent.change(nameInput, { target: { value: 'Warning' } })

    expect(mockWindowApi.storage.saveSettings).not.toHaveBeenCalled()

    fireEvent.blur(nameInput)

    await waitFor(() => {
      expect(mockWindowApi.storage.saveSettings).toHaveBeenCalledTimes(1)
    })
    expect(mockWindowApi.storage.saveSettings).toHaveBeenLastCalledWith({
      notificationThresholds: [
        { value: 25, enabled: true, name: 'Warning' },
        { value: 10, enabled: true },
        { value: 5, enabled: true }
      ]
    })

    vi.clearAllMocks()

    const valueInput = screen.getAllByLabelText('Quota threshold percentage')[0]
    fireEvent.change(valueInput, { target: { value: '2' } })
    fireEvent.change(valueInput, { target: { value: '20' } })

    expect(mockWindowApi.storage.saveSettings).not.toHaveBeenCalled()

    fireEvent.blur(valueInput)

    await waitFor(() => {
      expect(mockWindowApi.storage.saveSettings).toHaveBeenCalledTimes(1)
    })
    expect(mockWindowApi.storage.saveSettings).toHaveBeenLastCalledWith({
      notificationThresholds: [
        { value: 20, enabled: true, name: 'Warning' },
        { value: 10, enabled: true },
        { value: 5, enabled: true }
      ]
    })
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
