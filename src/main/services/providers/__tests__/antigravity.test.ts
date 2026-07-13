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
})
