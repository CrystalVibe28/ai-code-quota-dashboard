import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest'
import i18n from 'i18next'
import { render, screen } from '../../../../test/test-utils'
import { Overview } from '../Overview'
import { CustomizationProvider } from '../../contexts/CustomizationContext'
import { DEFAULT_GLOBAL_CONFIG } from '../../constants/customization'
import { useAntigravityStore } from '../../stores/useAntigravityStore'
import { useGithubCopilotStore } from '../../stores/useGithubCopilotStore'
import { useZaiCodingStore } from '../../stores/useZaiCodingStore'
import { useCodexStore } from '../../stores/useCodexStore'
import { useOpencodeGoStore } from '../../stores/useOpencodeGoStore'
import { useAiStudioStore } from '../../stores/useAiStudioStore'
import { useCustomizationStore } from '../../stores/useCustomizationStore'
import { mockWindowApi } from '../../../../test/mocks/window-api'
import zhTW from '../../i18n/locales/zh-TW.json'

describe('Overview', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockWindowApi.storage.getCustomization.mockResolvedValue(null)

    useAntigravityStore.setState({ accounts: [], usageData: [] })
    useGithubCopilotStore.setState({ accounts: [], usageData: [] })
    useZaiCodingStore.setState({ accounts: [], usageData: [] })
    useOpencodeGoStore.setState({ accounts: [], usageData: [] })
    useAiStudioStore.setState({ accounts: [], usageData: [] })
    useCodexStore.setState({
      accounts: [
        {
          id: 'codex-account',
          displayName: 'Codex User',
          showInOverview: true,
          email: 'codex@example.com',
          planType: 'plus',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          idToken: 'id-token',
          expiresAt: Date.now() + 60000,
          accountId: 'account-id',
          organizationId: 'organization-id'
        }
      ],
      usageData: [
        {
          accountId: 'codex-account',
          name: 'Codex User',
          email: 'codex@example.com',
          usage: {
            plan_type: 'plus',
            rate_limit: null,
            code_review_rate_limit: null
          }
        }
      ]
    })
    useCustomizationStore.setState({
      global: DEFAULT_GLOBAL_CONFIG,
      providers: {
        antigravity: {},
        githubCopilot: {},
        zaiCoding: {},
        codex: {},
        opencodeGo: {},
        aiStudio: {}
      },
      cards: {}
    })
  })

  it('should render Codex no-data state when rate limit blocks are null', () => {
    render(
      <CustomizationProvider>
        <Overview />
      </CustomizationProvider>
    )

    expect(screen.getByText('codex.noQuotaData')).toBeInTheDocument()
    expect(screen.getByText('overview.columns.quota')).toBeInTheDocument()
  })

  it('should distinguish Zai 5-hour and weekly quotas by unit', async () => {
    i18n.addResourceBundle('zh-TW', 'translation', zhTW, true, true)
    await i18n.changeLanguage('zh-TW')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const limits = [
      { type: 'TOKENS_LIMIT', unit: 3, number: 5, percentage: 1 },
      { type: 'TOKENS_LIMIT', unit: 6, number: 1, percentage: 1 }
    ]

    useZaiCodingStore.setState({
      accounts: [{
        id: 'zai-account',
        displayName: 'Zai User',
        showInOverview: true,
        name: 'Zai User',
        apiKey: 'api-key',
        selectedLimits: []
      }],
      usageData: [{ accountId: 'zai-account', name: 'Zai User', usage: { limits } }]
    })

    render(
      <CustomizationProvider>
        <Overview />
      </CustomizationProvider>
    )

    expect(screen.getByText('5 小時配額')).toBeInTheDocument()
    expect(screen.getByText('每週配額')).toBeInTheDocument()
    expect(consoleError.mock.calls.some(call => call.join(' ').includes('same key'))).toBe(false)
    consoleError.mockRestore()
  })

  it('should localize shared Antigravity quota labels', async () => {
    i18n.addResourceBundle('zh-TW', 'translation', zhTW, true, true)
    await i18n.changeLanguage('zh-TW')

    useAntigravityStore.setState({
      accounts: [
        {
          id: 'antigravity-account',
          displayName: 'Antigravity User',
          showInOverview: true,
          email: 'antigravity@example.com',
          name: 'Antigravity User',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 60000,
          projectId: 'project-id',
          selectedModels: []
        }
      ],
      usageData: [
        {
          accountId: 'antigravity-account',
          name: 'Antigravity User',
          usage: [
            { modelName: 'Gemini 5-hour', remainingFraction: 0.9 },
            { modelName: 'Gemini weekly', remainingFraction: 0.8 },
            { modelName: 'Claude/GPT 5-hour', remainingFraction: 0.7 },
            { modelName: 'Claude/GPT weekly', remainingFraction: 0.6 }
          ]
        }
      ]
    })

    render(
      <CustomizationProvider>
        <Overview />
      </CustomizationProvider>
    )

    expect(screen.getByText('Gemini 5 小時配額')).toBeInTheDocument()
    expect(screen.getByText('Gemini 每週配額')).toBeInTheDocument()
    expect(screen.getByText('Claude/GPT 5 小時配額')).toBeInTheDocument()
    expect(screen.getByText('Claude/GPT 每週配額')).toBeInTheDocument()
  })

  it('should apply every data display setting to usage cards', () => {
    const resetTime = new Date('2026-07-12T08:30:00Z').toISOString()
    const expectedResetTime = new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(resetTime))

    useAntigravityStore.setState({
      accounts: [{
        id: 'antigravity-account',
        displayName: 'Antigravity User',
        showInOverview: true,
        email: 'antigravity@example.com',
        name: 'Antigravity User',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 60000,
        projectId: 'project-id',
        selectedModels: []
      }],
      usageData: [{
        accountId: 'antigravity-account',
        name: 'Antigravity User',
        usage: [{ modelName: 'Gemini', remainingFraction: 0.7497692 }]
      }]
    })
    useGithubCopilotStore.setState({
      accounts: [{
        id: 'github-account',
        displayName: 'GitHub User',
        showInOverview: true,
        login: 'octocat',
        email: 'github@example.com',
        name: 'GitHub User',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 60000,
        selectedQuotas: []
      }],
      usageData: [{
        accountId: 'github-account',
        name: 'GitHub User',
        login: 'octocat',
        usage: {
          accessTypeSku: 'individual',
          copilotPlan: 'individual',
          quotaResetDate: resetTime,
          quotaSnapshots: {
            chat: { entitlement: 1000, remaining: 500, percent_remaining: 50, unlimited: false }
          }
        }
      }]
    })
    useCustomizationStore.setState({
      global: {
        ...DEFAULT_GLOBAL_CONFIG,
        valueFormat: 'absolute',
        decimalPlaces: 2,
        timeFormat: 'absolute',
        showResetTime: true
      }
    })

    render(
      <CustomizationProvider>
        <Overview />
      </CustomizationProvider>
    )

    expect(screen.getByText('74.98%')).toBeInTheDocument()
    expect(screen.getByText('500 / 1,000')).toBeInTheDocument()
    expect(screen.queryByText('50.00%')).not.toBeInTheDocument()
    expect(screen.getByText(expectedResetTime)).toBeInTheDocument()
  })
})
