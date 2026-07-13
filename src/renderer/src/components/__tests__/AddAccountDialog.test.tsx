import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../../../test/test-utils'
import { AddAccountDialog } from '../common/AddAccountDialog'
import { mockWindowApi } from '../../../../test/mocks/window-api'

describe('AddAccountDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('should select providers from an interactive dropdown inside the dialog', async () => {
    render(<AddAccountDialog isOpen={true} onClose={vi.fn()} />)

    const providerSelect = screen.getByRole('combobox', { name: 'addAccount.selectProvider' })
    const dialog = providerSelect.closest('dialog')

    expect(providerSelect).toBeInTheDocument()
    expect(providerSelect).toHaveTextContent('Antigravity')

    fireEvent.keyDown(providerSelect, { key: 'ArrowDown' })

    const listbox = await screen.findByRole('listbox')
    expect(dialog).toContainElement(listbox)

    fireEvent.click(screen.getByRole('option', { name: /Zai Coding Plan/ }))

    await waitFor(() => {
      expect(providerSelect).toHaveTextContent('Zai Coding Plan')
      expect(screen.getByLabelText('addAccount.apiKey')).toBeInTheDocument()
    })
  })

  it('should cancel an in-progress OAuth login when closing the dialog', async () => {
    let resolveLogin: ((result: { success: boolean; error?: string }) => void) | undefined

    mockWindowApi.antigravity.login.mockImplementation(
      () => new Promise((resolve) => {
        resolveLogin = resolve
      })
    )

    mockWindowApi.antigravity.cancelLogin.mockImplementation(async () => {
      resolveLogin?.({ success: false, error: 'Login cancelled' })
      return true
    })

    const onClose = vi.fn()

    render(<AddAccountDialog isOpen={true} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'addAccount.signInWith' }))

    await waitFor(() => {
      expect(mockWindowApi.antigravity.login).toHaveBeenCalledTimes(1)
    })

    const cancelButton = screen.getByRole('button', { name: 'common.cancel' })
    expect(cancelButton).not.toBeDisabled()

    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(mockWindowApi.antigravity.cancelLogin).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
