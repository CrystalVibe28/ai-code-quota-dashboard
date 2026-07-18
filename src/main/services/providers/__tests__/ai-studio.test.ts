import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiStudioService, parseAiStudioMonitoringMetrics, parseAiStudioQuotaInfos } from '../ai-studio'
import { GoogleOAuthService } from '../google-oauth'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('parseAiStudioQuotaInfos', () => {
  it('merges RPM, TPM and RPD by model for the selected tier', () => {
    const dimension = (model: string, value: string) => ({ dimensions: { model }, details: { value } })
    const values = [
      {
        quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
        dimensionsInfos: [dimension('gemini-2.5-flash', '5')]
      },
      {
        quotaId: 'GenerateContentInputTokensPerModelPerMinute-FreeTier',
        dimensionsInfos: [dimension('gemini-2.5-flash', '250000')]
      },
      {
        quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
        dimensionsInfos: [dimension('gemini-2.5-flash', '20')]
      },
      {
        quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-PaidTier2',
        dimensionsInfos: [dimension('gemini-2.5-flash', '1000')]
      }
    ]

    expect(parseAiStudioQuotaInfos(values, 'free')).toEqual([
      {
        model: 'gemini-2.5-flash',
        rpm: 5,
        tpm: 250000,
        rpd: 20,
        rpmUsed: 0,
        tpmUsed: 0,
        rpdUsed: 0
      }
    ])
  })

  it('keeps unlimited daily limits for tier 1 models', () => {
    const dimension = (value: string) => ({
      dimensions: { model: 'gemini-2.5-flash' },
      details: { value }
    })
    expect(parseAiStudioQuotaInfos([
      {
        quotaId: 'GenerateRequestsPerDayPerProjectPerModel',
        dimensionsInfos: [dimension('-1')]
      },
      {
        quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-PaidTier',
        dimensionsInfos: [dimension('-1'), dimension('50')]
      }
    ], 'tier1')).toEqual([{
      model: 'gemini-2.5-flash',
      rpm: 50,
      tpm: null,
      rpd: -1,
      rpmUsed: 0,
      tpmUsed: 0,
      rpdUsed: 0
    }])
  })

  it('detects the active tier and current per-model usage', () => {
    const now = Date.parse('2026-07-16T12:05:00Z')
    const series = (model: string, values: Array<[string, number]>) => ({
      metric: { labels: { model } },
      points: values.map(([endTime, value]) => ({
        interval: { endTime },
        value: { int64Value: String(value) }
      }))
    })
    const results = [
      {
        descriptor: {
          type: 'generativelanguage.googleapis.com/quota/generate_content_free_tier_requests/limit',
          displayName: 'Generate content requests free tier quota limit'
        },
        timeSeries: [series('gemini-2.5-flash', [['2026-07-16T12:02:00Z', 5]])]
      },
      {
        descriptor: {
          type: 'generativelanguage.googleapis.com/quota/generate_content_free_tier_requests/usage',
          displayName: 'Generate content requests free tier quota usage'
        },
        timeSeries: [
          series('gemini-2.5-flash', [['2026-07-16T12:02:00Z', 2]]),
          series('gemini-2.5-flash', [['2026-07-16T12:02:30Z', 1]])
        ]
      },
      {
        descriptor: {
          type: 'generativelanguage.googleapis.com/quota/generate_content_free_tier_input_token_count/usage',
          displayName: 'Generate content input tokens free tier quota usage'
        },
        timeSeries: [series('models/gemini-2.5-flash', [['2026-07-16T12:02:00Z', 100]])]
      },
      {
        descriptor: {
          type: 'generativelanguage.googleapis.com/quota/generate_requests_per_model_per_day_internal/usage',
          displayName: 'Generate content requests per model per day quota usage'
        },
        timeSeries: [series('gemini-2.5-flash', [
          ['2026-07-16T07:30:00Z', 4],
          ['2026-07-16T11:00:00Z', 3]
        ])]
      }
    ]

    const parsed = parseAiStudioMonitoringMetrics(results, 'tier3', now)

    expect(parsed.tier).toBe('free')
    expect(parsed.usage.get('gemini-2.5-flash')).toEqual({
      rpmUsed: 3,
      tpmUsed: 100,
      rpdUsed: 7
    })
  })

  it('prefers paid tier evidence over newer free tier usage', () => {
    const series = (endTime: string) => ({
      metric: { labels: { model: 'gemini-2.5-flash' } },
      points: [{ interval: { endTime }, value: { int64Value: '1' } }]
    })
    const parsed = parseAiStudioMonitoringMetrics([
      {
        descriptor: {
          type: 'generativelanguage.googleapis.com/quota/generate_content_free_tier_requests/usage',
          displayName: 'Generate content requests free tier quota usage'
        },
        timeSeries: [series('2026-07-16T12:04:00Z')]
      },
      {
        descriptor: {
          type: 'generativelanguage.googleapis.com/quota/generate_requests_per_model/limit',
          displayName: 'Generate content requests per model paid tier quota limit'
        },
        timeSeries: [series('2026-07-16T12:03:00Z')]
      }
    ], 'free', Date.parse('2026-07-16T12:05:00Z'))

    expect(parsed.tier).toBe('tier1')
    expect(parsed.detectedTier).toBeNull()
  })

  it('uses the paid fallback when monitoring cannot identify the detailed tier', () => {
    const parsed = parseAiStudioMonitoringMetrics([{
      descriptor: {
        type: 'generativelanguage.googleapis.com/quota/generate_requests_per_model/usage',
        displayName: 'Generate content requests per model paid tier quota usage'
      },
      timeSeries: [{
        metric: { labels: { model: 'gemini-2.5-flash' } },
        points: [{ interval: { endTime: '2026-07-16T12:04:00Z' }, value: { int64Value: '1' } }]
      }]
    }], 'tier2', Date.parse('2026-07-16T12:05:00Z'), 'tier3')

    expect(parsed.tier).toBe('tier3')
    expect(parsed.detectedTier).toBeNull()
  })

  it('uses newer detailed paid tier evidence instead of the highest tier', () => {
    const series = (endTime: string) => ({
      metric: { labels: { model: 'gemini-2.5-flash' } },
      points: [{ interval: { endTime }, value: { int64Value: '1' } }]
    })
    const parsed = parseAiStudioMonitoringMetrics([
      {
        descriptor: {
          type: 'generativelanguage.googleapis.com/quota/generate_content_paid_tier_3_requests/usage',
          displayName: 'Generate content requests paid tier 3 quota usage'
        },
        timeSeries: [series('2026-07-16T12:02:00Z')]
      },
      {
        descriptor: {
          type: 'generativelanguage.googleapis.com/quota/generate_content_paid_tier_2_requests/usage',
          displayName: 'Generate content requests paid tier 2 quota usage'
        },
        timeSeries: [series('2026-07-16T12:04:00Z')]
      }
    ], 'tier3', Date.parse('2026-07-16T12:05:00Z'))

    expect(parsed.tier).toBe('tier2')
    expect(parsed.detectedTier).toBe('tier2')
  })

  it('adds the official model display name to quota data', async () => {
    const service = new AiStudioService()
    vi.spyOn(service as any, 'listQuotaInfos').mockResolvedValue([{
      quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
      dimensionsInfos: [
        { dimensions: { model: 'gemini-2.5-flash' }, details: { value: '5' } },
        { dimensions: { model: 'not-whitelisted' }, details: { value: '5' } }
      ]
    }])
    vi.spyOn(service as any, 'listMonitoringDescriptors').mockResolvedValue([])
    vi.spyOn(service as any, 'listModels').mockResolvedValue(new Map([
      ['gemini-2.5-flash', 'Gemini 2.5 Flash']
    ]))
    const usage = await service.fetchUsage({
      accessToken: 'access-token',
      projectId: 'project-id',
      projectNumber: '123456789',
      tier: 'free'
    })

    expect(usage.limits).toEqual([expect.objectContaining({
      model: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash'
    })])
  })

  it('uses a readable model name when model metadata is unavailable', async () => {
    const service = new AiStudioService()
    vi.spyOn(service as any, 'listQuotaInfos').mockResolvedValue([{
      quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
      dimensionsInfos: [{ dimensions: { model: 'gemini-2.5-flash' }, details: { value: '5' } }]
    }])
    vi.spyOn(service as any, 'listMonitoringDescriptors').mockResolvedValue([])
    vi.spyOn(service as any, 'listModels').mockRejectedValue(new Error('Models API unavailable'))
    const usage = await service.fetchUsage({
      accessToken: 'access-token',
      projectId: 'project-id',
      projectNumber: '123456789',
      tier: 'free'
    })

    expect(usage.limits[0]).toMatchObject({
      model: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash'
    })
  })

  it('uses quota billing eligibility over free tier monitoring', async () => {
    const service = new AiStudioService()
    vi.spyOn(service as any, 'listQuotaInfos').mockResolvedValue([{
      quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-PaidTier',
      quotaIncreaseEligibility: { isEligible: true },
      dimensionsInfos: [{ dimensions: { model: 'gemini-2.5-flash' }, details: { value: '150' } }]
    }])
    vi.spyOn(service as any, 'listMonitoringDescriptors').mockResolvedValue([{
      type: 'generativelanguage.googleapis.com/quota/generate_content_free_tier_requests/usage',
      displayName: 'Generate content requests free tier quota usage'
    }])
    vi.spyOn(service as any, 'listTimeSeries').mockResolvedValue([{
      metric: { labels: { model: 'gemini-2.5-flash' } },
      points: [{ interval: { endTime: new Date().toISOString() }, value: { int64Value: '1' } }]
    }])
    vi.spyOn(service as any, 'listModels').mockResolvedValue(new Map())

    const usage = await service.fetchUsage({
      accessToken: 'access-token',
      projectId: 'project-id',
      projectNumber: '123456789',
      tier: 'free'
    })

    expect(usage).toMatchObject({
      tier: 'tier1',
      tierSource: 'default',
      limits: [{ model: 'gemini-2.5-flash', rpm: 150 }]
    })
  })

  it('uses the manual tier when a paid project has no detailed tier evidence', async () => {
    const service = new AiStudioService()
    vi.spyOn(service as any, 'listQuotaInfos').mockResolvedValue([{
      quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-PaidTier2',
      quotaIncreaseEligibility: { isEligible: true },
      dimensionsInfos: [{ dimensions: { model: 'gemini-2.5-flash' }, details: { value: '1000' } }]
    }])
    vi.spyOn(service as any, 'listMonitoringDescriptors').mockResolvedValue([{
      type: 'generativelanguage.googleapis.com/quota/generate_requests_per_model/usage',
      displayName: 'Generate content requests per model paid tier quota usage'
    }])
    vi.spyOn(service as any, 'listTimeSeries').mockResolvedValue([{
      metric: { labels: { model: 'gemini-2.5-flash' } },
      points: [{ interval: { endTime: new Date().toISOString() }, value: { int64Value: '1' } }]
    }])
    vi.spyOn(service as any, 'listModels').mockResolvedValue(new Map())

    const usage = await service.fetchUsage({
      accessToken: 'access-token',
      projectId: 'project-id',
      projectNumber: '123456789',
      tier: 'tier3',
      manualTier: 'tier2',
      tierSource: 'system'
    })

    expect(usage).toMatchObject({
      tier: 'tier2',
      tierSource: 'manual',
      limits: [{ model: 'gemini-2.5-flash', rpm: 1000 }]
    })
  })

  it('uses a detailed system tier over the manual fallback', async () => {
    const service = new AiStudioService()
    vi.spyOn(service as any, 'listQuotaInfos').mockResolvedValue([{
      quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-PaidTier2',
      quotaIncreaseEligibility: { isEligible: true },
      dimensionsInfos: [{ dimensions: { model: 'gemini-2.5-flash' }, details: { value: '1000' } }]
    }])
    vi.spyOn(service as any, 'listMonitoringDescriptors').mockResolvedValue([{
      type: 'generativelanguage.googleapis.com/quota/generate_content_paid_tier_2_requests/limit',
      displayName: 'Generate content requests paid tier 2 quota limit'
    }])
    vi.spyOn(service as any, 'listTimeSeries').mockResolvedValue([{
      metric: { labels: { model: 'gemini-2.5-flash' } },
      points: [{ interval: { endTime: new Date().toISOString() }, value: { int64Value: '1000' } }]
    }])
    vi.spyOn(service as any, 'listModels').mockResolvedValue(new Map())

    const usage = await service.fetchUsage({
      accessToken: 'access-token',
      projectId: 'project-id',
      projectNumber: '123456789',
      tier: 'tier3',
      manualTier: 'tier3',
      tierSource: 'manual'
    })

    expect(usage).toMatchObject({
      tier: 'tier2',
      tierSource: 'system'
    })
  })

  it('lists active projects after Google sign-in', async () => {
    vi.spyOn(GoogleOAuthService.prototype, 'login').mockResolvedValue({
      success: true,
      account: {
        userId: 'user-1',
        email: 'user@example.com',
        name: 'User',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000
      }
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      projects: [{
        projectId: 'my-project-123',
        projectNumber: '123456789',
        name: 'My Project',
        lifecycleState: 'ACTIVE'
      }]
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await new AiStudioService().login()

    expect(result.account?.projects[0].projectNumber).toBe('123456789')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cloudresourcemanager.googleapis.com/v1/projects?pageSize=100&filter=lifecycleState%3AACTIVE',
      expect.objectContaining({
        headers: { 'Authorization': 'Bearer access-token' }
      })
    )
  })
})
