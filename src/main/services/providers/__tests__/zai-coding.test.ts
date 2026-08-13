import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZaiCodingService } from '../zai-coding'

const fetchMock = vi.fn()

function textResponse(text: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(text)
  } as unknown as Response
}

describe('ZaiCodingService.fetchUsage', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('throws an observable error for HTTP failures', async () => {
    fetchMock.mockResolvedValue(textResponse('', 429))

    await expect(new ZaiCodingService().fetchUsage('api-key'))
      .rejects.toThrow('HTTP 429')
  })

  it.each([
    ['', 'Usage response was empty'],
    ['not-json', 'Usage response was not valid JSON'],
    [JSON.stringify({ success: false }), 'Usage API rejected the request'],
    [JSON.stringify({ success: true, data: {} }), 'Usage response did not include limits']
  ])('rejects an invalid response without exposing its body', async (body, message) => {
    fetchMock.mockResolvedValue(textResponse(body))

    await expect(new ZaiCodingService().fetchUsage('api-key')).rejects.toThrow(message)
  })

  it('accepts an explicit empty limits array', async () => {
    fetchMock.mockResolvedValue(textResponse(JSON.stringify({
      success: true,
      data: { limits: [] }
    })))

    await expect(new ZaiCodingService().fetchUsage('api-key'))
      .resolves.toEqual({ limits: [] })
  })

  it('rejects malformed quota numbers', async () => {
    fetchMock.mockResolvedValue(textResponse(JSON.stringify({
      success: true,
      data: { limits: [{ type: 'TOKENS_LIMIT', percentage: '25' }] }
    })))

    await expect(new ZaiCodingService().fetchUsage('api-key'))
      .rejects.toThrow('invalid limit')
  })
})
