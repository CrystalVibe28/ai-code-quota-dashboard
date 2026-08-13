import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '../../../../test/test-utils'
import { CustomizationProvider } from '../../contexts/CustomizationContext'
import { DEFAULT_GLOBAL_CONFIG } from '../../constants/customization'
import { useAntigravityStore } from '../../stores/useAntigravityStore'
import { useAiStudioStore } from '../../stores/useAiStudioStore'
import { useCodexStore } from '../../stores/useCodexStore'
import { useOpencodeGoStore } from '../../stores/useOpencodeGoStore'
import { useCustomizationStore } from '../../stores/useCustomizationStore'
import { useErrorStore } from '../../stores/useErrorStore'
import { mockWindowApi } from '../../../../test/mocks/window-api'
import { ProviderAccount } from '../ProviderAccount'

describe('ProviderAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWindowApi.storage.getCustomization.mockResolvedValue(null)
    mockWindowApi.storage.getQuotaHistory.mockResolvedValue({
      weekly: [],
      monthly: [],
      audit: { provider: [], account: [] }
    })
    useErrorStore.setState({ errors: [], lastError: null })
    useAntigravityStore.setState({
      accounts: [{
        id: 'account',
        displayName: 'Test Account',
        showInOverview: true,
        email: 'test@example.com',
        name: 'Test Account',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 60000,
        projectId: 'project-id',
        selectedModels: []
      }],
      usageData: [{
        accountId: 'account',
        name: 'Test Account',
        usage: [
          { modelName: 'model-a', remainingFraction: 0.8 },
          { modelName: 'model-b', remainingFraction: 0.7 }
        ]
      }]
    })
    useAiStudioStore.setState({ accounts: [], usageData: [], isLoading: false, error: null })
    useOpencodeGoStore.setState({ accounts: [], usageData: [], isLoading: false, error: null })
    useCustomizationStore.setState({
      isLoaded: true,
      global: DEFAULT_GLOBAL_CONFIG,
      providers: {
        antigravity: { accountCardVisibility: { account: true } },
        githubCopilot: {},
        zaiCoding: {},
        codex: {},
        opencodeGo: {},
        ollamaCloud: {},
        aiStudio: {}
      },
      cards: {
        'antigravity-account-model-a': { visible: true },
        'antigravity-account-model-b': { visible: false }
      }
    })
  })

  it('offers to hide all when only some cards are visible', async () => {
    render(
      <MemoryRouter initialEntries={['/provider/antigravity/account']}>
        <Routes>
          <Route path="provider/:providerId/:accountId" element={(
            <CustomizationProvider>
              <ProviderAccount />
            </CustomizationProvider>
          )} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Hide all' }))

    await waitFor(() => {
      expect(useCustomizationStore.getState().cards['antigravity-account-model-a'].visible).toBe(false)
      expect(useCustomizationStore.getState().cards['antigravity-account-model-b'].visible).toBe(false)
      expect(screen.getByRole('button', { name: 'Show all' })).toBeInTheDocument()
    })
  })

  it('shows only the Codex history period that has data', async () => {
    useCodexStore.setState({
      accounts: [{
        id: 'codex-account',
        displayName: 'Codex Account',
        showInOverview: true,
        email: 'codex@example.com',
        planType: 'pro',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        idToken: 'id-token',
        expiresAt: Date.now() + 60000,
        accountId: 'remote-account',
        organizationId: 'organization'
      }],
      usageData: []
    })
    mockWindowApi.storage.getQuotaHistory.mockResolvedValue({
      weekly: [{ seriesKey: 'rateLimit:primary', sampledAt: Date.now(), remaining: 80 }],
      monthly: [],
      audit: { provider: [], account: [] }
    })

    render(
      <MemoryRouter initialEntries={['/provider/codex/codex-account']}>
        <Routes>
          <Route path="provider/:providerId/:accountId" element={(
            <CustomizationProvider>
              <ProviderAccount />
            </CustomizationProvider>
          )} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Weekly quota history')).toBeInTheDocument()
    expect(screen.queryByText('Monthly quota history')).not.toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(1)
  })

  it('shows both Codex periods when both contain history', async () => {
    useCodexStore.setState({
      accounts: [{
        id: 'codex-account',
        displayName: 'Codex Account',
        showInOverview: true,
        email: 'codex@example.com',
        planType: 'pro',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        idToken: 'id-token',
        expiresAt: Date.now() + 60000,
        accountId: 'remote-account',
        organizationId: 'organization'
      }],
      usageData: []
    })
    mockWindowApi.storage.getQuotaHistory.mockResolvedValue({
      weekly: [{ seriesKey: 'rateLimit:primary', sampledAt: Date.now(), remaining: 80 }],
      monthly: [{ seriesKey: 'rateLimit:secondary', sampledAt: Date.now(), remaining: 70 }],
      audit: { provider: [], account: [] }
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/provider/codex/codex-account']}>
        <Routes>
          <Route path="provider/:providerId/:accountId" element={(
            <CustomizationProvider>
              <ProviderAccount />
            </CustomizationProvider>
          )} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Weekly quota history')).toBeInTheDocument()
    expect(screen.getByText('Monthly quota history')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(container.querySelectorAll('circle[data-series-endpoint]')).toHaveLength(2)
    expect(mockWindowApi.storage.getQuotaHistory)
      .toHaveBeenCalledWith('codex', 'codex-account')
  })

  it('keeps the last chart and reports a storage error when history reload fails', async () => {
    const sampledAt = Date.now()
    mockWindowApi.storage.getQuotaHistory
      .mockResolvedValueOnce({
        weekly: [{ seriesKey: 'geminiWeekly', sampledAt, remaining: 80 }],
        monthly: [],
        audit: { provider: [], account: [] }
      })
      .mockRejectedValueOnce(new Error('database busy'))

    const { container } = render(
      <MemoryRouter initialEntries={['/provider/antigravity/account']}>
        <Routes>
          <Route path="provider/:providerId/:accountId" element={(
            <CustomizationProvider>
              <ProviderAccount />
            </CustomizationProvider>
          )} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Weekly quota history')).toBeInTheDocument()
    expect(container.querySelector('path[data-series-key="geminiWeekly"]')).toBeInTheDocument()

    act(() => {
      useAntigravityStore.setState({
        usageData: [{
          accountId: 'account',
          name: 'Test Account',
          usage: [{ modelName: 'model-a', remainingFraction: 0.75 }]
        }]
      })
    })

    await waitFor(() => {
      expect(mockWindowApi.storage.getQuotaHistory).toHaveBeenCalledTimes(2)
      expect(useErrorStore.getState().lastError).toMatchObject({
        code: 'ERR_STORAGE_READ',
        details: 'Error: database busy'
      })
    })
    expect(screen.getByRole('alert')).toHaveTextContent('errors.storage.readFailed')
    expect(container.querySelector('path[data-series-key="geminiWeekly"]')).toBeInTheDocument()
  })

  it('falls back to provider audit for hours without an account attempt', async () => {
    mockWindowApi.storage.getQuotaHistory.mockResolvedValue({
      weekly: [{ seriesKey: 'geminiWeekly', sampledAt: Date.now(), remaining: 80 }],
      monthly: [],
      audit: {
        provider: [{
          sampledAt: Date.now() - 3600000,
          lastAttemptAt: Date.now() - 3599000,
          attempts: 1,
          successes: 0,
          failures: 1,
          lastSuccess: false
        }],
        account: [{
          sampledAt: Date.now(),
          lastAttemptAt: Date.now(),
          attempts: 1,
          successes: 1,
          failures: 0,
          lastSuccess: true
        }]
      }
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/provider/antigravity/account']}>
        <Routes>
          <Route path="provider/:providerId/:accountId" element={(
            <CustomizationProvider>
              <ProviderAccount />
            </CustomizationProvider>
          )} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByText('Weekly quota history')
    expect(container.querySelector('[data-sync-failures="1"]')).toBeInTheDocument()
  })

  it('shows reauthorization on an AI Studio account with an expired grant', () => {
    const account = {
      id: 'ai-studio-account',
      displayName: 'AI Studio User',
      showInOverview: true,
      userId: 'google-user',
      email: 'user@example.com',
      name: 'User',
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      expiresAt: 1,
      projectId: 'project',
      projectNumber: '1',
      projectName: 'Project',
      tier: 'free' as const
    }
    useAiStudioStore.setState({
      accounts: [account],
      usageData: [{
        accountId: account.id,
        name: account.displayName,
        usage: null,
        error: 'Error: Token refresh failed: 400 (invalid_grant)'
      }]
    })

    render(
      <MemoryRouter initialEntries={['/provider/aiStudio/ai-studio-account']}>
        <Routes>
          <Route path="provider/:providerId/:accountId" element={(
            <CustomizationProvider>
              <ProviderAccount />
            </CustomizationProvider>
          )} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: 'aiStudio.reauthorization.action' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument()
  })

  it('offers a safe sign-in recovery when an Opencode Go session expires', () => {
    const login = vi.fn().mockResolvedValue({ success: false, error: 'cancelled' })
    useOpencodeGoStore.setState({
      accounts: [{
        id: 'opencode-account',
        displayName: 'Opencode Account',
        showInOverview: true,
        workspaceId: 'workspace',
        cookieHeader: 'stored-cookie',
        expiresAt: 1
      }],
      usageData: [{
        accountId: 'opencode-account',
        name: 'Opencode Account',
        workspaceId: 'workspace',
        usage: null,
        error: 'Error: Opencode Go session expired'
      }],
      login
    })

    render(
      <MemoryRouter initialEntries={['/provider/opencodeGo/opencode-account']}>
        <Routes>
          <Route path="provider/:providerId/:accountId" element={(
            <CustomizationProvider>
              <ProviderAccount />
            </CustomizationProvider>
          )} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'opencodeGo.reauthorization.action' }))

    expect(login).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument()
  })
})
