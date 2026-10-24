import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AntigravityService } from '../antigravity'

vi.mock('electron', () => ({
  shell: { openExternal: vi.fn() }
}))

const fetchMock = vi.fn()

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data)
  } as unknown as Response
}

describe('AntigravityService.fetchUsage', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('should prefer shared 5-hour and weekly quota buckets', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      response: {
        groups: [
          {
            displayName: 'Gemini Models',
            buckets: [
              {
                bucketId: 'gemini-weekly',
                displayName: 'Weekly Limit',
                remaining: { remainingFraction: 0.82 },
                resetTime: '2026-06-19T08:45:39Z'
              },
              {
                bucketId: 'gemini-5h',
                displayName: 'Five Hour Limit',
                remaining: { case: 'remainingFraction', value: 0.91234 },
                resetTime: '2026-06-15T11:39:34Z'
              },
              {
                bucketId: 'gemini-5h-disabled',
                disabled: true,
                remaining: { remainingFraction: 0 }
              }
            ]
          },
          {
            displayName: 'Claude and GPT models',
            buckets: [
              {
                bucketId: '3p-weekly',
                remaining: { case: 'remainingFraction', value: 0.64 },
                resetTime: '2026-06-20T00:39:54Z'
              },
              {
                bucketId: '3p-5h',
                remainingFraction: 0.73,
                resetTime: '2026-06-15T12:52:10Z'
              }
            ]
          },
          {
            displayName: 'Gemini 4 Argon',
            buckets: [
              {
                bucketId: 'gemini-argon-wtu-weekly',
                window: 'weekly',
                remainingFraction: 0.55,
                resetTime: '2026-06-21T00:00:00Z'
              }
            ]
          }
        ]
      }
    }))

    const usage = await new AntigravityService().fetchUsage({
      accessToken: 'access-token',
      projectId: 'project-id'
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary'
    )
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ project: 'project-id' })
    })
    // Older CLI versions do not receive the Gemini and Gemini 4 Argon groups.
    expect(fetchMock.mock.calls[0][1].headers['User-Agent']).toMatch(/^antigravity\/cli\/1\.5\.0 /)
    expect(usage).toEqual([
      {
        modelName: 'Gemini 5-hour',
        remainingFraction: 0.91234,
        resetTime: '2026-06-15T11:39:34Z'
      },
      {
        modelName: 'Gemini weekly',
        remainingFraction: 0.82,
        resetTime: '2026-06-19T08:45:39Z'
      },
      {
        modelName: 'Claude/GPT 5-hour',
        remainingFraction: 0.73,
        resetTime: '2026-06-15T12:52:10Z'
      },
      {
        modelName: 'Claude/GPT weekly',
        remainingFraction: 0.64,
        resetTime: '2026-06-20T00:39:54Z'
      },
      {
        modelName: 'Gemini 4 Argon weekly',
        remainingFraction: 0.55,
        resetTime: '2026-06-21T00:00:00Z'
      }
    ])
  })

  it('should fall back to legacy model quotas when the summary is unavailable', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 404))
      .mockResolvedValueOnce(jsonResponse({}, 404))
      .mockResolvedValueOnce(jsonResponse({
        models: {
          'gemini-legacy': {
            displayName: 'Gemini Legacy',
            quotaInfo: {
              remainingFraction: 0.4,
              resetTime: '2026-06-15T11:39:34Z'
            }
          },
          'gemini-missing-quota': {
            displayName: 'Gemini Missing',
            quotaInfo: {}
          }
        }
      }))

    const usage = await new AntigravityService().fetchUsage({
      accessToken: 'access-token',
      projectId: 'project-id'
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(usage).toEqual([
      {
        modelName: 'Gemini Legacy',
        remainingFraction: 0.4,
        resetTime: '2026-06-15T11:39:34Z'
      }
    ])
  })

  it('merges partial quota summaries from both endpoints', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        groups: [{
          buckets: [{ bucketId: 'gemini-5h', remainingFraction: 0.9 }]
        }]
      }))
      .mockResolvedValueOnce(jsonResponse({
        groups: [{
          buckets: [{ bucketId: 'gemini-weekly', remainingFraction: 0.8 }]
        }]
      }))

    const usage = await new AntigravityService().fetchUsage({
      accessToken: 'access-token',
      projectId: 'project-id'
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(usage).toMatchObject([
      { modelName: 'Gemini 5-hour', remainingFraction: 0.9 },
      { modelName: 'Gemini weekly', remainingFraction: 0.8 }
    ])
  })

  it('does not replace an authoritative daily bucket with a fallback value', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        groups: [{
          buckets: [{
            bucketId: 'gemini-weekly',
            remainingFraction: 0.9,
            resetTime: '2026-06-19T08:45:39Z'
          }]
        }]
      }))
      .mockResolvedValueOnce(jsonResponse({
        groups: [{
          buckets: [{
            bucketId: 'gemini-weekly',
            remainingFraction: 0.2,
            resetTime: '2026-06-20T08:45:39Z'
          }]
        }]
      }))

    await expect(new AntigravityService().fetchUsage({
      accessToken: 'access-token',
      projectId: 'project-id'
    })).resolves.toMatchObject([{
      modelName: 'Gemini weekly',
      remainingFraction: 0.9,
      resetTime: '2026-06-19T08:45:39Z'
    }])
  })
})

describe('AntigravityService.fetchPlan', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it.each([
    [{ currentTier: { id: 'free-tier' }, paidTier: { id: 'g1-pro-tier', name: 'Google AI Pro' } }, 'Google AI Pro'],
    [{ currentTier: { id: 'free-tier' }, paidTier: { id: 'g1-ultra-tier', name: 'Localized name' } }, 'Google AI Ultra'],
    [{ currentTier: { id: 'free-tier' }, paidTier: { id: 'new-tier', name: 'New Plan' } }, 'New Plan'],
    [{ currentTier: { id: 'free-tier', name: 'Antigravity' } }, 'Free'],
    [{ currentTier: { id: 'standard-tier', name: 'Antigravity' } }, undefined]
  ])('should read the plan from the paid tier before the current tier', async (data, expected) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(data))

    await expect(new AntigravityService().fetchPlan('access-token')).resolves.toBe(expected)
  })

  it('should not fail usage refreshes when the plan request fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 500))

    await expect(new AntigravityService().fetchPlan('access-token')).resolves.toBeUndefined()
  })
})
