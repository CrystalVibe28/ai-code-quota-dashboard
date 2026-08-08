import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: vi.fn(() => '') } }))

import { getLocalApiHost, LocalApiService, USAGE_API_PATH } from '../local-api'

describe('getLocalApiHost', () => {
  it('binds remotely only when explicitly enabled', () => {
    expect(getLocalApiHost(false)).toBe('127.0.0.1')
    expect(getLocalApiHost(true)).toBe('0.0.0.0')
  })
})

describe('LocalApiService', () => {
  const getUsage = vi.fn(() => ({
    updatedAt: 123,
    providers: {
      antigravity: [{ accountId: 'anti', name: 'Anti', usage: { remaining: 80 } }],
      githubCopilot: [],
      zaiCoding: [],
      codex: [],
      opencodeGo: [],
      ollamaCloud: [],
      aiStudio: []
    }
  }))
  const isUnlocked = vi.fn(() => true)
  let service: LocalApiService
  let url: string

  beforeEach(async () => {
    vi.clearAllMocks()
    service = new LocalApiService({ port: 0, getUsage, isUnlocked })
    const port = await service.start()
    url = `http://127.0.0.1:${port}${USAGE_API_PATH}`
  })

  afterEach(async () => {
    await service.stop()
  })

  it('returns only the current local cache even when refresh is requested in the URL', async () => {
    const response = await fetch(`${url}?refresh=true`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      version: 1,
      source: 'local-cache',
      updatedAt: 123,
      providers: {
        antigravity: [{ accountId: 'anti', name: 'Anti', usage: { remaining: 80 } }],
        githubCopilot: [],
        zaiCoding: [],
        codex: [],
        opencodeGo: [],
        ollamaCloud: [],
        aiStudio: []
      }
    })
    expect(getUsage).toHaveBeenCalledTimes(1)
  })

  it('rejects write methods without reading the cache', async () => {
    const response = await fetch(url, { method: 'POST' })

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET')
    expect(getUsage).not.toHaveBeenCalled()
  })

  it('does not expose cached data while storage is locked', async () => {
    isUnlocked.mockReturnValue(false)

    const response = await fetch(url)

    expect(response.status).toBe(423)
    expect(getUsage).not.toHaveBeenCalled()
  })
})
