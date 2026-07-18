import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../../../test/test-utils'
import { AddAccountDialog } from '../common/AddAccountDialog'
import { mockWindowApi } from '../../../../test/mocks/window-api'

describe('AddAccountDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWindowApi.aiStudio.hasOAuthCredentials.mockResolvedValue(true)
    mockWindowApi.aiStudio.saveOAuthCredentials.mockResolvedValue(true)
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
    expect(screen.getByRole('option', { name: /Google AI Studio/ })).toBeInTheDocument()

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

  it('should configure AI Studio OAuth once before showing Google sign-in', async () => {
    mockWindowApi.aiStudio.hasOAuthCredentials.mockResolvedValue(false)
    mockWindowApi.aiStudio.login.mockResolvedValue({
      success: true,
      account: {
        userId: 'user-1',
        email: 'user@example.com',
        name: 'User',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        projects: [{ projectId: 'project-1', projectNumber: '123', name: 'Project 1' }]
      }
    })

    render(<AddAccountDialog isOpen={true} onClose={vi.fn()} />)

    const providerSelect = screen.getByRole('combobox', { name: 'addAccount.selectProvider' })
    fireEvent.keyDown(providerSelect, { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('option', { name: /Google AI Studio/ }))

    const clientId = await screen.findByLabelText('aiStudio.oauthCredentials.clientId')
    const clientSecret = screen.getByLabelText('aiStudio.oauthCredentials.clientSecret')
    expect(screen.getByLabelText('addAccount.displayName')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'addAccount.signInWith' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('addAccount.project')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'aiStudio.oauthCredentials.setupGuide' }))
      .toHaveAttribute('href', expect.stringContaining('/docs/google-ai-studio-oauth.md'))

    fireEvent.change(clientId, { target: { value: 'client-id' } })
    fireEvent.change(clientSecret, { target: { value: 'client-secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'aiStudio.oauthCredentials.save' }))

    await waitFor(() => {
      expect(mockWindowApi.aiStudio.saveOAuthCredentials)
        .toHaveBeenCalledWith('client-id', 'client-secret')
      expect(screen.getByRole('button', { name: 'addAccount.signInWith' })).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('aiStudio.oauthCredentials.clientId')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'aiStudio.oauthCredentials.testUsersGuide' }))
      .toHaveAttribute('href', expect.stringContaining('#test-users'))

    fireEvent.click(screen.getByRole('button', { name: 'addAccount.signInWith' }))
    expect(await screen.findByLabelText('addAccount.project')).toBeInTheDocument()
  })
})
