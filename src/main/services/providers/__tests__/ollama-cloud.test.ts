import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const authSession = {
    clearStorageData: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn().mockResolvedValue(undefined),
    cookies: { get: vi.fn().mockResolvedValue([]) }
  }
  const authWindow = {
    webContents: {
      setWindowOpenHandler: vi.fn(),
      on: vi.fn()
    },
    loadURL: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    isDestroyed: vi.fn(() => false),
    close: vi.fn()
  }

  return {
    authSession,
    authWindow,
    BrowserWindow: vi.fn(function BrowserWindow() { return authWindow }),
    fromPartition: vi.fn(() => authSession),
    fetchWithTimeout: vi.fn()
  }
})

vi.mock('electron', () => ({
  BrowserWindow: mocks.BrowserWindow,
  session: { fromPartition: mocks.fromPartition }
}))

vi.mock('../fetchWithTimeout', () => ({ fetchWithTimeout: mocks.fetchWithTimeout }))

import {
  OllamaCloudService,
  OLLAMA_CLOUD_AUTH_PARTITION,
  OLLAMA_CLOUD_SESSION_EXPIRED,
  parseEmail,
  parseOllamaCloudUsage
} from '../ollama-cloud'

beforeEach(() => vi.clearAllMocks())

describe('OllamaCloudService.login', () => {
  it('clears the persisted auth session before opening settings', async () => {
    const service = new OllamaCloudService()
    const loginPromise = service.login()

    await vi.waitFor(() => {
      expect(mocks.authWindow.loadURL).toHaveBeenCalledWith('https://ollama.com/settings')
    })

    expect(mocks.fromPartition).toHaveBeenCalledWith(OLLAMA_CLOUD_AUTH_PARTITION)
    expect(mocks.authSession.clearStorageData).toHaveBeenCalledTimes(1)
    expect(mocks.authSession.clearCache).toHaveBeenCalledTimes(1)

    service.cancelLogin()
    await loginPromise
  })
})

describe('OllamaCloudService.fetchUsage', () => {
  it('reports an expired session without sending a request once the cookie has expired', async () => {
    const service = new OllamaCloudService()

    await expect(service.fetchUsage({ cookieHeader: 'session=test', expiresAt: Date.now() - 1000 }))
      .rejects.toThrow(OLLAMA_CLOUD_SESSION_EXPIRED)
    expect(mocks.fetchWithTimeout).not.toHaveBeenCalled()
  })

  it('reports an expired session when settings redirect to sign in', async () => {
    mocks.fetchWithTimeout.mockResolvedValue(new Response(null, {
      status: 303,
      headers: { location: '/signin' }
    }))
    const service = new OllamaCloudService()

    await expect(service.fetchUsage({ cookieHeader: 'session=test', expiresAt: Date.now() + 60000 }))
      .rejects.toThrow(OLLAMA_CLOUD_SESSION_EXPIRED)
  })
})

describe('parseOllamaCloudUsage', () => {
  it('parses the five-hour session and weekly quotas', () => {
    const usage = parseOllamaCloudUsage(`
      <h2><span>Cloud usage</span><span>free</span></h2>
      <div>
        <span>Session usage</span><span>12.5% used</span>
        <div aria-label="Session usage 12.5% used"></div>
        <div data-time="2026-07-21T05:00:00Z">Resets in 4 hours.</div>
      </div>
      <div>
        <span>Weekly usage</span><span>40% used</span>
        <div aria-label="Weekly usage 40% used"></div>
        <div data-time="2026-07-27T00:00:00Z">Resets in 5 days.</div>
      </div>
    `)

    expect(usage).toEqual({
      plan: 'free',
      limits: [
        {
          type: 'session',
          used: 12.5,
          limit: 100,
          remaining: 87.5,
          percentage: 12.5,
          resetTime: '2026-07-21T05:00:00Z',
          unit: 'percent',
          unlimited: false
        },
        {
          type: 'weekly',
          used: 40,
          limit: 100,
          remaining: 60,
          percentage: 40,
          resetTime: '2026-07-27T00:00:00Z',
          unit: 'percent',
          unlimited: false
        }
      ]
    })
  })

  it('parses the free plan monthly quota from the redesigned page', () => {
    const usage = parseOllamaCloudUsage(`
      <h2 class="text-xl font-medium flex items-center space-x-2">
        <span>Included usage</span>
        <span
          class="text-xs font-normal px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 capitalize"
          >free</span
        >
      </h2>
      <div>
        <span class="text-sm">Free usage</span><span class="text-sm">0% used</span>
        <div aria-label="Free usage 0% used"></div>
        <div data-time="2026-10-09T12:33:46Z">Resets on Oct 9.</div>
      </div>
    `)

    expect(usage).toEqual({
      plan: 'free',
      limits: [
        {
          type: 'monthly',
          used: 0,
          limit: 100,
          remaining: 100,
          percentage: 0,
          resetTime: '2026-10-09T12:33:46Z',
          unit: 'percent',
          unlimited: false
        }
      ]
    })
  })

  it('parses the usage credits page where the percentage has no "used" suffix', () => {
    const usage = parseOllamaCloudUsage(`
      <div id="extra-usage">
        <h2 class="text-xl">Usage credits<span class="capitalize">free</span></h2>
        <span id="extra-usage-balance">$0</span>
      </div>
      <p>Free usage credits can be used with the following cloud models:</p>
      <div data-time="2026-01-01T00:00:00Z">Unrelated</div>
      <div>
        <div><span>Free usage</span><span>0%</span></div>
        <div aria-label="Free usage: 0%"><div style="width: 0%"></div></div>
        <div data-time="2026-11-09T12:33:46Z">Refills in 4 weeks.</div>
      </div>
    `)

    expect(usage).toEqual({
      plan: 'free',
      limits: [
        {
          type: 'monthly',
          used: 0,
          limit: 100,
          remaining: 100,
          percentage: 0,
          resetTime: '2026-11-09T12:33:46Z',
          unit: 'percent',
          unlimited: false
        }
      ]
    })
  })
})

describe('parseEmail', () => {
  it('reads the email from the legacy header', () => {
    expect(parseEmail('<h2 id="header-email">user@example.com</h2>')).toBe('user@example.com')
  })

  it('reads the email from the settings account menu', () => {
    expect(parseEmail(`
      <details id="settings-account-menu">
        <summary><span><span>user@example.com</span></span></summary>
        <div><div><div>user@example.com</div></div></div>
      </details>
    `)).toBe('user@example.com')
  })

  it('returns null when no email is present', () => {
    expect(parseEmail('<details id="settings-account-menu"><summary>Account</summary></details>')).toBeNull()
  })
})
