import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpencodeGoService } from '../opencode-go'

const payload = {
  usage: Object.fromEntries(['rolling', 'weekly', 'monthly'].map((period, index) => [period, {
    status: 'ok', percent: 12.5 + index, resetsAt: '2026-09-22T00:00:00.000Z'
  }]))
}

afterEach(() => vi.unstubAllGlobals())

describe('OpencodeGoService', () => {
  it('fetches official quota data with a Bearer key and maps all periods', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)))
    vi.stubGlobal('fetch', fetch)
    const usage = await new OpencodeGoService().fetchUsage({ apiKey: ' test-key ' })
    expect(fetch).toHaveBeenCalledWith('https://opencode.ai/zen/go/v1/usage', expect.objectContaining({
      redirect: 'error', headers: { Accept: 'application/json', Authorization: 'Bearer test-key' }
    }))
    expect(usage.limits.map(limit => [limit.type, limit.percentage, limit.remaining])).toEqual([
      ['rollingUsage', 12.5, 87.5], ['weeklyUsage', 13.5, 86.5], ['monthlyUsage', 14.5, 85.5]
    ])
    expect(usage.limits[0].resetTime).toBe(Date.parse('2026-09-22T00:00:00.000Z'))
  })

  it('requires a key for legacy accounts without making a request', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(new OpencodeGoService().fetchUsage({ workspaceId: 'old' })).rejects.toThrow('API key required')
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([[401, 'API key invalid'], [403, 'subscription required'], [500, '500']])(
    'handles HTTP %s without exposing the response body', async (status, error) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('sensitive upstream body', { status })))
      const validation = await new OpencodeGoService().validateApiKey('test-key')
      expect(validation.valid).toBe(false)
      expect(validation.error).toContain(error)
      expect(validation.error).not.toContain('sensitive')
    }
  )

  it('rejects incomplete usage instead of showing a misleading quota', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ usage: { rolling: payload.usage.rolling } }))))
    await expect(new OpencodeGoService().fetchUsage({ apiKey: 'test-key' })).rejects.toThrow('Invalid Opencode Go usage response')
  })

  it('clamps rate-limited usage to the display range', async () => {
    const data = structuredClone(payload)
    data.usage.rolling = { ...data.usage.rolling, status: 'rate-limited', percent: 110 }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(data))))
    const result = await new OpencodeGoService().fetchUsage({ apiKey: 'test-key' })
    expect(result.limits[0]).toMatchObject({ percentage: 100, remaining: 0 })
  })
})
