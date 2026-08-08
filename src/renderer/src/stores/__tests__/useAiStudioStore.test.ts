import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { useAiStudioStore } from '../useAiStudioStore'
import { mockWindowApi } from '../../../../test/mocks/window-api'

describe('useAiStudioStore', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.clearAllMocks()
    mockWindowApi.storage.getAccounts.mockResolvedValue([])
    mockWindowApi.aiStudio.fetchAllUsage.mockResolvedValue([])
    useAiStudioStore.setState({
      accounts: [],
      usageData: [],
      isLoading: false,
      error: null
    })
  })

  it('uses the Google user and project as the account identity', async () => {
    const project = { projectId: 'my-project-123', projectNumber: '123456789', name: 'My Project' }
    const session = {
      userId: 'google-user-1',
      email: 'user@example.com',
      name: 'User',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 3600000,
      projects: [project]
    }

    await useAiStudioStore.getState().addAccount(session, project, 'My AI Studio')

    expect(mockWindowApi.storage.saveAccount).toHaveBeenCalledWith(
      'aiStudio',
      expect.objectContaining({
        id: 'google-user-1:my-project-123',
        userId: 'google-user-1',
        projectId: 'my-project-123',
        tier: 'free'
      })
    )
  })

  it('updates only the matching account after reauthorization', async () => {
    const account = {
      id: 'google-user-1:my-project-123',
      displayName: 'My AI Studio',
      showInOverview: true,
      userId: 'google-user-1',
      email: 'old@example.com',
      name: 'Old Name',
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      expiresAt: 1,
      projectId: 'my-project-123',
      projectNumber: '123456789',
      projectName: 'Old Project Name',
      tier: 'tier2' as const,
      manualTier: 'tier2' as const,
      tierSource: 'manual' as const
    }
    const project = {
      projectId: account.projectId,
      projectNumber: '987654321',
      name: 'Renamed Project'
    }
    mockWindowApi.aiStudio.login.mockResolvedValue({
      success: true,
      account: {
        userId: account.userId,
        email: 'new@example.com',
        name: 'New Name',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: 123456,
        projects: [project]
      }
    })
    mockWindowApi.storage.getAccounts.mockResolvedValue([account])
    useAiStudioStore.setState({ accounts: [account] })

    await expect(useAiStudioStore.getState().reauthorizeAccount(account.id)).resolves.toBe(true)

    expect(mockWindowApi.storage.updateAccount).toHaveBeenCalledWith('aiStudio', account.id, {
      email: 'new@example.com',
      name: 'New Name',
      picture: undefined,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: 123456,
      projectNumber: project.projectNumber,
      projectName: project.name
    })
    expect(mockWindowApi.storage.updateAccount.mock.calls[0][2]).not.toHaveProperty('tier')
    expect(mockWindowApi.aiStudio.fetchAllUsage).toHaveBeenCalledOnce()
  })

  it('rejects reauthorization from a different Google account', async () => {
    const account = {
      id: 'google-user-1:my-project-123',
      displayName: 'My AI Studio',
      showInOverview: true,
      userId: 'google-user-1',
      email: 'expected@example.com',
      name: 'Expected User',
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      expiresAt: 1,
      projectId: 'my-project-123',
      projectNumber: '123456789',
      projectName: 'My Project',
      tier: 'free' as const
    }
    useAiStudioStore.setState({ accounts: [account] })
    mockWindowApi.aiStudio.login.mockResolvedValue({
      success: true,
      account: {
        userId: 'another-google-user',
        email: 'other@example.com',
        name: 'Other User',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: 123456,
        projects: []
      }
    })

    await expect(useAiStudioStore.getState().reauthorizeAccount(account.id)).resolves.toBe(false)

    expect(mockWindowApi.storage.updateAccount).not.toHaveBeenCalled()
    expect(mockWindowApi.aiStudio.fetchAllUsage).not.toHaveBeenCalled()
    expect(useAiStudioStore.getState().error).toContain('expected@example.com')
  })

  it('does not replace a missing or inaccessible project', async () => {
    const account = {
      id: 'google-user-1:missing-project',
      displayName: 'My AI Studio',
      showInOverview: true,
      userId: 'google-user-1',
      email: 'user@example.com',
      name: 'User',
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      expiresAt: 1,
      projectId: 'missing-project',
      projectNumber: '123456789',
      projectName: 'Missing Project',
      tier: 'free' as const
    }
    useAiStudioStore.setState({ accounts: [account] })
    mockWindowApi.aiStudio.login.mockResolvedValue({
      success: true,
      account: {
        userId: account.userId,
        email: account.email,
        name: account.name,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: 123456,
        projects: [{ projectId: 'another-project', projectNumber: '2', name: 'Another Project' }]
      }
    })

    await expect(useAiStudioStore.getState().reauthorizeAccount(account.id)).resolves.toBe(false)

    expect(mockWindowApi.storage.updateAccount).not.toHaveBeenCalled()
    expect(mockWindowApi.aiStudio.fetchAllUsage).not.toHaveBeenCalled()
    expect(useAiStudioStore.getState().error).toContain('Missing Project')
  })
})
