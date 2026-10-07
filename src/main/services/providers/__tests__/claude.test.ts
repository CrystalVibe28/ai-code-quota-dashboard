import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClaudeService } from '../claude'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body))
  } as unknown as Response
}

function credentials(overrides: Record<string, unknown> = {}): () => Promise<string | null> {
  return async () => JSON.stringify({
    claudeAiOauth: {
      accessToken: 'test-token',
      expiresAt: Date.now() + 60_000,
      scopes: ['user:inference', 'user:profile'],
      subscriptionType: 'max',
      rateLimitTier: 'default_claude_max_20x',
      ...overrides
    }
  })
}

describe('ClaudeService', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('maps usage windows to remaining quota', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      five_hour: { utilization: 11, resets_at: '2026-07-03T00:30:00.282668+00:00' },
      seven_day: { utilization: 9.5, resets_at: '2026-07-08T09:00:00.282694+00:00' },
      seven_day_opus: null,
      seven_day_sonnet: { utilization: 120 }
    }))

    const usage = await new ClaudeService(credentials()).fetchUsage()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/api/oauth/usage',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'anthropic-beta': 'oauth-2025-04-20'
        })
      })
    )
    expect(usage.plan).toBe('Max 20x')
    expect(usage.limits).toEqual([
      expect.objectContaining({
        type: 'fiveHour', remaining: 89, resetTime: '2026-07-03T00:30:00.282668+00:00'
      }),
      expect.objectContaining({ type: 'weekly', remaining: 90.5 }),
      expect.objectContaining({ type: 'weeklyModel:Sonnet', used: 100, remaining: 0 })
    ])
    expect(usage.limits[2]).not.toHaveProperty('resetTime')
  })

  it('falls back to the limits list when legacy windows are missing', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      five_hour: null,
      limits: [
        { kind: 'session', percent: 20, resets_at: '2026-07-03T00:30:00Z', scope: null },
        { kind: 'weekly_all', percent: 30, resets_at: '2026-07-08T09:00:00Z', scope: null },
        {
          kind: 'weekly_scoped',
          percent: 5,
          resets_at: '2026-07-08T09:00:00Z',
          scope: { model: { id: null, display_name: 'Fable' }, surface: null }
        }
      ]
    }))

    const usage = await new ClaudeService(credentials()).fetchUsage()

    expect(usage.limits.map(limit => [limit.type, limit.remaining])).toEqual([
      ['fiveHour', 80],
      ['weekly', 70],
      ['weeklyModel:Fable', 95]
    ])
  })

  it('reuses a recent result instead of calling the API again', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ five_hour: { utilization: 10 } }))
    const service = new ClaudeService(credentials())

    const first = await service.fetchUsage()
    const second = await service.fetchUsage()

    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stops calling the API while rate limited', async () => {
    fetchMock.mockResolvedValue(jsonResponse('', 429, { 'retry-after': '120' }))
    const service = new ClaudeService(credentials())

    await expect(service.fetchUsage()).rejects.toThrow('rate limited')
    await expect(service.fetchUsage()).rejects.toThrow('rate limited')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fails without calling the API when credentials are unusable', async () => {
    await expect(new ClaudeService(async () => null).fetchUsage())
      .rejects.toThrow('Claude Code credentials not found')
    await expect(new ClaudeService(async () => JSON.stringify({ mcpOAuth: {} })).fetchUsage())
      .rejects.toThrow('Claude Code credentials not found')
    await expect(new ClaudeService(credentials({ scopes: ['user:inference'] })).fetchUsage())
      .rejects.toThrow('user:profile')
    await expect(new ClaudeService(credentials({ expiresAt: Date.now() - 1 })).fetchUsage())
      .rejects.toThrow('login expired')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports rejected and failed requests', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse('', 401))
    await expect(new ClaudeService(credentials()).fetchUsage()).rejects.toThrow('401')

    fetchMock.mockResolvedValueOnce(jsonResponse('OAuth token does not meet scope requirement user:profile', 403))
    await expect(new ClaudeService(credentials()).fetchUsage()).rejects.toThrow('user:profile')

    fetchMock.mockResolvedValueOnce(jsonResponse('', 500))
    await expect(new ClaudeService(credentials()).fetchUsage()).rejects.toThrow('HTTP 500')
  })

  it('creates an account from the local login and keeps the existing identity', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ account: { email: 'user@example.com' } }))
    const service = new ClaudeService(credentials())

    const created = await service.login()
    expect(created).toMatchObject({
      success: true,
      account: { displayName: 'Claude', email: 'user@example.com', subscriptionType: 'max', showInOverview: true }
    })
    expect(JSON.stringify(created)).not.toContain('test-token')

    const updated = await service.login({ ...created.account!, displayName: 'Work', showInOverview: false })
    expect(updated.account).toMatchObject({ id: created.account!.id, displayName: 'Work', showInOverview: false })
  })

  it('still signs in when the profile request fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))

    await expect(new ClaudeService(credentials()).login())
      .resolves.toMatchObject({ success: true, account: { email: '' } })
  })

  it('reports a missing local login', async () => {
    await expect(new ClaudeService(async () => null).login())
      .resolves.toMatchObject({ success: false, error: expect.stringContaining('credentials not found') })
  })
})
