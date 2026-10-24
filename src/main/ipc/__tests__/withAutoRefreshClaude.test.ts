import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClaudeAccount } from '@shared/types'
import { ClaudeService } from '../../services/providers/claude'
import { StorageService } from '../../services/storage'
import { setClaudeServices, withAutoRefreshClaude } from '../utils/withAutoRefreshClaude'

vi.mock('../../services/providers/claude')
vi.mock('../../services/storage')

describe('withAutoRefreshClaude', () => {
  let account: ClaudeAccount
  let claudeService: ClaudeService
  let storageService: StorageService

  beforeEach(() => {
    vi.clearAllMocks()
    account = {
      id: 'claude-id',
      email: 'claude@example.com',
      displayName: 'Claude',
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() + 60000,
      showInOverview: true
    }
    claudeService = new ClaudeService()
    storageService = new StorageService()
    vi.spyOn(storageService, 'getAccounts').mockResolvedValue([account])
    setClaudeServices(claudeService, storageService)
  })

  it('coalesces concurrent refreshes and persists rotated tokens once', async () => {
    const tokens = {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresAt: Date.now() + 3600000
    }
    let resolveRefresh!: (value: typeof tokens) => void
    const refresh = vi.spyOn(claudeService, 'refreshToken').mockReturnValue(
      new Promise(resolve => {
        resolveRefresh = resolve
      })
    )
    const update = vi.spyOn(storageService, 'updateAccount').mockResolvedValue(true)
    const firstOperation = vi.fn().mockResolvedValue('first')
    const secondOperation = vi.fn().mockResolvedValue('second')

    const first = withAutoRefreshClaude(account, firstOperation)
    const second = withAutoRefreshClaude(account, secondOperation)
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    resolveRefresh(tokens)

    await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second'])
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith('claude', 'claude-id', tokens)
    expect(firstOperation).toHaveBeenCalledWith(expect.objectContaining(tokens))
    expect(secondOperation).toHaveBeenCalledWith(expect.objectContaining(tokens))
  })

  it('refreshes once and retries when a nominally valid token gets a 401', async () => {
    account.expiresAt = Date.now() + 10 * 60 * 1000
    const tokens = {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresAt: Date.now() + 3600000
    }
    vi.spyOn(claudeService, 'refreshToken').mockResolvedValue(tokens)
    vi.spyOn(storageService, 'updateAccount').mockResolvedValue(true)
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Claude sign-in was rejected (401).'))
      .mockResolvedValueOnce('ok')

    await expect(withAutoRefreshClaude(account, operation)).resolves.toBe('ok')

    expect(operation).toHaveBeenCalledTimes(2)
    expect(operation).toHaveBeenLastCalledWith(expect.objectContaining(tokens))
  })

  it('uses tokens another refresh already stored instead of spending the old one', async () => {
    const rotated = { ...account, accessToken: 'stored-access', refreshToken: 'stored-refresh', expiresAt: Date.now() + 3600000 }
    vi.spyOn(storageService, 'getAccounts').mockResolvedValue([rotated])
    const refresh = vi.spyOn(claudeService, 'refreshToken')
    const operation = vi.fn().mockResolvedValue('ok')

    await expect(withAutoRefreshClaude(account, operation)).resolves.toBe('ok')

    expect(refresh).not.toHaveBeenCalled()
    expect(operation).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'stored-access' }))
  })

  it('returns null when the grant was revoked', async () => {
    vi.spyOn(claudeService, 'refreshToken').mockResolvedValue(null)
    const operation = vi.fn()

    await expect(withAutoRefreshClaude(account, operation)).resolves.toBeNull()
    expect(operation).not.toHaveBeenCalled()
  })

  it('asks accounts without stored tokens to sign in', async () => {
    const operation = vi.fn()

    await expect(withAutoRefreshClaude({ ...account, refreshToken: undefined }, operation))
      .rejects.toThrow('sign-in required')
    expect(operation).not.toHaveBeenCalled()
  })
})
