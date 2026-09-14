import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandCodeService } from '../command-code'

const fetchMock = vi.fn()

function textResponse(text: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(text)
  } as unknown as Response
}

describe('CommandCodeService', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('validates an API key with whoami', async () => {
    fetchMock.mockResolvedValue(textResponse(JSON.stringify({
      success: true,
      user: { id: 'user-1', userName: 'dogoin' }
    })))

    await expect(new CommandCodeService().validateApiKey('secret-key'))
      .resolves.toEqual({ valid: true })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.commandcode.ai/alpha/whoami',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret-key' })
      })
    )
  })

  it('rejects an unauthorized API key', async () => {
    fetchMock.mockResolvedValue(textResponse('', 401))

    await expect(new CommandCodeService().validateApiKey('bad-key'))
      .resolves.toEqual({ valid: false, error: 'Invalid API key' })
  })

  it('maps billing windows to remaining quota', async () => {
    fetchMock.mockResolvedValueOnce(textResponse(JSON.stringify({
      credits: {
        monthlyCredits: 14,
        purchasedCredits: 2,
        freeCredits: 1,
        planId: 'individual-goat'
      },
      windowLimits: {
        fiveHour: { used: 7, cap: 14, exceeded: false, resetAt: 1_800_000_000_000 },
        weekly: { used: 7, cap: 35, exceeded: false, resetAt: 1_800_100_000_000 }
      }
    })))
      .mockResolvedValueOnce(textResponse(JSON.stringify({
        success: true,
        user: { id: 'user-1' },
        org: { id: 'org-1' }
      })))
      .mockResolvedValueOnce(textResponse(JSON.stringify({
        data: {
          planId: 'individual-goat',
          status: 'active',
          currentPeriodEnd: '2026-10-05'
        }
      })))

    await expect(new CommandCodeService().fetchUsage('secret-key')).resolves.toEqual({
      credits: { monthlyRemaining: 14, purchased: 2, free: 1, planId: 'individual-goat' },
      limits: [
        {
          type: 'fiveHour',
          used: 7,
          limit: 14,
          remaining: 7,
          percentage: 50,
          resetTime: 1_800_000_000_000,
          unit: 'usd',
          unlimited: false
        },
        {
          type: 'weekly',
          used: 7,
          limit: 35,
          remaining: 28,
          percentage: 20,
          resetTime: 1_800_100_000_000,
          unit: 'usd',
          unlimited: false
        },
        {
          type: 'monthly',
          used: 56,
          limit: 70,
          remaining: 14,
          percentage: 80,
          resetTime: '2026-10-05',
          unit: 'usd',
          unlimited: false
        }
      ]
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.commandcode.ai/alpha/billing/subscriptions?orgId=org-1',
      expect.any(Object)
    )
  })

  it('rejects malformed usage without exposing the response body', async () => {
    fetchMock.mockResolvedValue(textResponse(JSON.stringify({
      credits: { monthlyCredits: 'secret payload' },
      windowLimits: {}
    })))

    await expect(new CommandCodeService().fetchUsage('secret-key'))
      .rejects.toThrow('invalid credits or limits')
  })
})
