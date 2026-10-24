import { get } from 'http'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClaudeAccount } from '@shared/types'
import { ClaudeService } from '../claude'

const { openExternal } = vi.hoisted(() => ({ openExternal: vi.fn() }))
vi.mock('electron', () => ({ shell: { openExternal } }))

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

function account(overrides: Partial<ClaudeAccount> = {}): ClaudeAccount {
  return {
    id: 'account-1',
    displayName: 'Claude',
    showInOverview: true,
    email: 'user@example.com',
    subscriptionType: 'max',
    rateLimitTier: 'default_claude_max_20x',
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresAt: Date.now() + 3600_000,
    ...overrides
  }
}

function visit(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    get(url, res => {
      res.resume()
      res.on('end', resolve)
    }).on('error', reject)
  })
}

// Plays the browser's part: follows the authorize URL's redirect_uri back to the loopback server.
function completeInBrowser(params: (authUrl: URL) => Record<string, string>): void {
  openExternal.mockImplementation(async (value: string) => {
    const authUrl = new URL(value)
    const callback = new URL(authUrl.searchParams.get('redirect_uri')!.replace('localhost', '127.0.0.1'))
    for (const [key, param] of Object.entries(params(authUrl))) callback.searchParams.set(key, param)
    void visit(callback.toString())
  })
}

describe('ClaudeService', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    openExternal.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('maps usage windows to remaining quota', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      five_hour: { utilization: 11, resets_at: '2026-07-03T00:30:00.282668+00:00' },
      seven_day: { utilization: 9.5, resets_at: '2026-07-08T09:00:00.282694+00:00' },
      seven_day_opus: null,
      seven_day_sonnet: { utilization: 120 }
    }))

    const usage = await new ClaudeService().fetchUsage(account())

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

    const usage = await new ClaudeService().fetchUsage(account())

    expect(usage.limits.map(limit => [limit.type, limit.remaining])).toEqual([
      ['fiveHour', 80],
      ['weekly', 70],
      ['weeklyModel:Fable', 95]
    ])
  })

  it('reuses a recent result per account instead of calling the API again', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ five_hour: { utilization: 10 } }))
    const service = new ClaudeService()

    const first = await service.fetchUsage(account())
    const second = await service.fetchUsage(account({ accessToken: 'rotated-token' }))
    await service.fetchUsage(account({ id: 'account-2' }))

    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('stops calling the API while rate limited', async () => {
    fetchMock.mockResolvedValue(jsonResponse('', 429, { 'retry-after': '120' }))
    const service = new ClaudeService()

    await expect(service.fetchUsage(account())).rejects.toThrow('rate limited')
    await expect(service.fetchUsage(account())).rejects.toThrow('rate limited')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('asks accounts without a stored token to sign in', async () => {
    await expect(new ClaudeService().fetchUsage(account({ accessToken: undefined })))
      .rejects.toThrow('sign-in required')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports rejected and failed requests', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse('', 401))
    await expect(new ClaudeService().fetchUsage(account())).rejects.toThrow('401')

    fetchMock.mockResolvedValueOnce(jsonResponse('OAuth token does not meet scope requirement user:profile', 403))
    await expect(new ClaudeService().fetchUsage(account())).rejects.toThrow('user:profile')

    fetchMock.mockResolvedValueOnce(jsonResponse('', 500))
    await expect(new ClaudeService().fetchUsage(account())).rejects.toThrow('HTTP 500')
  })

  it('signs in through the browser and keeps its own tokens', async () => {
    fetchMock.mockImplementation(async (url: string) => (
      url.endsWith('/token')
        ? jsonResponse({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          account: { uuid: 'token-uuid', email_address: 'token@example.com' }
        })
        : jsonResponse({
          account: { uuid: 'profile-uuid', email: 'user@example.com' },
          organization: { organization_type: 'claude_max', rate_limit_tier: 'default_claude_max_5x' }
        })
    ))
    completeInBrowser(authUrl => ({ code: 'auth-code', state: authUrl.searchParams.get('state')! }))

    const result = await new ClaudeService().login()

    expect(result).toMatchObject({
      success: true,
      account: {
        id: 'profile-uuid',
        displayName: 'user@example.com',
        email: 'user@example.com',
        subscriptionType: 'max',
        rateLimitTier: 'default_claude_max_5x',
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        showInOverview: true
      }
    })
    expect(result.account!.expiresAt).toBeGreaterThan(Date.now())

    const authUrl = new URL(openExternal.mock.calls[0][0])
    expect(authUrl.origin + authUrl.pathname).toBe('https://claude.ai/oauth/authorize')
    expect(authUrl.searchParams.get('scope')).toBe('user:profile')
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256')

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0]
    expect(tokenUrl).toBe('https://platform.claude.com/v1/oauth/token')
    expect(JSON.parse(tokenInit.body)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'auth-code',
      redirect_uri: authUrl.searchParams.get('redirect_uri'),
      state: authUrl.searchParams.get('state')
    })
  })

  it('falls back to the token response identity when the profile request fails', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (!url.endsWith('/token')) throw new Error('offline')
      return jsonResponse({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        account: { uuid: 'token-uuid', email_address: 'token@example.com' }
      })
    })
    completeInBrowser(authUrl => ({ code: 'auth-code', state: authUrl.searchParams.get('state')! }))

    await expect(new ClaudeService().login()).resolves.toMatchObject({
      success: true,
      account: { id: 'token-uuid', email: 'token@example.com' }
    })
  })

  it('rejects a callback with the wrong state without exchanging the code', async () => {
    completeInBrowser(() => ({ code: 'auth-code', state: 'forged' }))

    await expect(new ClaudeService().login())
      .resolves.toEqual({ success: false, error: 'State mismatch' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('cancels a pending sign-in', async () => {
    const service = new ClaudeService()
    openExternal.mockImplementation(async () => {
      expect(service.cancelLogin()).toBe(true)
    })

    await expect(service.login()).resolves.toEqual({ success: false, error: 'Login cancelled' })
    expect(service.cancelLogin()).toBe(false)
  })

  it('refreshes tokens and keeps the old refresh token when none is returned', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 'next-access', expires_in: 60 }))

    const tokens = await new ClaudeService().refreshToken('old-refresh')

    expect(tokens).toMatchObject({ accessToken: 'next-access', refreshToken: 'old-refresh' })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: 'old-refresh'
    })
  })

  it('tells a revoked grant apart from a failed refresh request', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'invalid_grant' }, 400))
    await expect(new ClaudeService().refreshToken('old-refresh')).resolves.toBeNull()

    fetchMock.mockResolvedValueOnce(jsonResponse('', 503))
    await expect(new ClaudeService().refreshToken('old-refresh')).rejects.toThrow('HTTP 503')
  })
})
