import { createHash } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPkcePair, GoogleOAuthService } from '../google-oauth'

const { openExternal } = vi.hoisted(() => ({ openExternal: vi.fn() }))
vi.mock('electron', () => ({ shell: { openExternal } }))

afterEach(() => vi.unstubAllGlobals())

describe('GoogleOAuthService PKCE', () => {
  it('sends the PKCE verifier alongside an optional client secret', async () => {
    const { codeVerifier, codeChallenge } = createPkcePair()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    expect(codeVerifier).toHaveLength(43)
    expect(codeChallenge).toBe(createHash('sha256').update(codeVerifier).digest('base64url'))

    const service = new GoogleOAuthService('desktop-client-id', 'optional-client-secret')
    await (service as any).exchangeCode('authorization-code', 'http://127.0.0.1/callback', codeVerifier)

    const options = fetchMock.mock.calls[0][1] as RequestInit
    const body = new URLSearchParams(options.body as string)
    expect(body.get('code_verifier')).toBe(codeVerifier)
    expect(body.get('client_secret')).toBe('optional-client-secret')
  })

  it('opens the desktop flow with S256 and provider-specific scopes', async () => {
    openExternal.mockResolvedValue(undefined)
    const service = new GoogleOAuthService('desktop-client-id', '', ['scope:ai-studio'])
    const login = service.login()

    await vi.waitFor(() => expect(openExternal).toHaveBeenCalledOnce())
    const authUrl = new URL(openExternal.mock.calls[0][0])
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256')
    expect(authUrl.searchParams.get('scope')?.split(' ')).toContain('scope:ai-studio')

    service.cancelLogin()
    await expect(login).resolves.toMatchObject({ success: false, error: 'Login cancelled' })
  })

  it('preserves Google token error details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'invalid_client',
      error_description: 'The OAuth client secret is incorrect.'
    }), { status: 400 })))

    const service = new GoogleOAuthService('desktop-client-id')
    await expect((service as any).exchangeCode('code', 'http://127.0.0.1/callback', 'verifier'))
      .rejects.toThrow('Token exchange failed: 400 (invalid_client: The OAuth client secret is incorrect.)')
  })

  it('preserves invalid_grant when a refresh token requires reauthorization', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'invalid_grant',
      error_subtype: 'invalid_rapt',
      error_description: 'Token has been expired or revoked.'
    }), { status: 400 })))

    const service = new GoogleOAuthService('desktop-client-id', 'client-secret')
    const refresh = service.refreshToken('private-refresh-token')

    await expect(refresh).rejects.toThrow(
      'Token refresh failed: 400 (invalid_grant: invalid_rapt: Token has been expired or revoked.)'
    )
    await expect(refresh).rejects.not.toThrow('private-refresh-token')
  })
})
