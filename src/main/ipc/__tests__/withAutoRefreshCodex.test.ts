import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CodexAccount } from '@shared/types'
import { CodexService } from '../../services/providers/codex'
import { StorageService } from '../../services/storage'
import { setCodexServices, withAutoRefreshCodex } from '../utils/withAutoRefreshCodex'

vi.mock('../../services/providers/codex')
vi.mock('../../services/storage')

describe('withAutoRefreshCodex', () => {
  let account: CodexAccount
  let codexService: CodexService
  let storageService: StorageService

  beforeEach(() => {
    vi.clearAllMocks()
    account = {
      id: 'codex-id',
      email: 'codex@example.com',
      displayName: 'Codex',
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      idToken: 'old-id',
      expiresAt: Date.now() + 60000,
      accountId: 'remote-id',
      organizationId: 'org-id',
      planType: 'pro',
      showInOverview: true
    }
    codexService = new CodexService()
    storageService = new StorageService()
    vi.spyOn(storageService, 'getAccounts').mockResolvedValue([account])
    setCodexServices(codexService, storageService)
  })

  it('coalesces concurrent refreshes and persists rotated tokens once', async () => {
    const tokens = {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      idToken: 'new-id',
      expiresAt: Date.now() + 3600000,
      accountId: 'remote-id',
      organizationId: 'org-id',
      planType: 'pro'
    }
    let resolveRefresh!: (value: typeof tokens) => void
    const refresh = vi.spyOn(codexService, 'refreshToken').mockReturnValue(
      new Promise(resolve => {
        resolveRefresh = resolve
      })
    )
    const update = vi.spyOn(storageService, 'updateAccount').mockResolvedValue(true)
    const firstOperation = vi.fn().mockResolvedValue('first')
    const secondOperation = vi.fn().mockResolvedValue('second')

    const first = withAutoRefreshCodex(account, firstOperation)
    const second = withAutoRefreshCodex(account, secondOperation)
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    resolveRefresh(tokens)

    await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second'])
    expect(update).toHaveBeenCalledTimes(1)
    expect(firstOperation).toHaveBeenCalledWith(expect.objectContaining(tokens))
    expect(secondOperation).toHaveBeenCalledWith(expect.objectContaining(tokens))
  })

  it('refreshes once and retries when a nominally valid token gets a 401', async () => {
    account.expiresAt = Date.now() + 10 * 60 * 1000
    const tokens = {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      idToken: 'new-id',
      expiresAt: Date.now() + 3600000,
      accountId: 'remote-id',
      organizationId: 'org-id',
      planType: 'pro'
    }
    vi.spyOn(codexService, 'refreshToken').mockResolvedValue(tokens)
    vi.spyOn(storageService, 'updateAccount').mockResolvedValue(true)
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Failed to fetch usage: 401'))
      .mockResolvedValueOnce('ok')

    await expect(withAutoRefreshCodex(account, operation)).resolves.toBe('ok')

    expect(operation).toHaveBeenCalledTimes(2)
    expect(operation).toHaveBeenLastCalledWith(expect.objectContaining(tokens))
  })
})
