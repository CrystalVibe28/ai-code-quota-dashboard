import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AntigravityAccount } from '@shared/types'
import { withAutoRefresh, REFRESH_THRESHOLD_MS, setServices } from '../utils/withAutoRefresh'
import { AntigravityService } from '../../services/providers/antigravity'
import { StorageService } from '../../services/storage'

vi.mock('../../services/providers/antigravity')
vi.mock('../../services/storage')

describe('withAutoRefresh', () => {
  let mockAccount: AntigravityAccount
  let mockAntigravityService: AntigravityService
  let mockStorageService: StorageService

  beforeEach(() => {
    vi.clearAllMocks()

    mockAccount = {
      id: 'test-account-id',
      email: 'test@example.com',
      name: 'Test User',
      displayName: 'Test User',
      accessToken: 'old-access-token',
      refreshToken: 'refresh-token-123',
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes in future
      projectId: 'test-project',
      selectedModels: [],
      showInOverview: true
    }

    mockAntigravityService = new AntigravityService()
    mockStorageService = new StorageService()
    vi.spyOn(mockStorageService, 'getAccounts').mockResolvedValue([mockAccount])
    setServices(mockAntigravityService, mockStorageService)
  })

  it('should NOT refresh when token is still valid (> 5 min remaining)', async () => {
    const refreshTokenSpy = vi.spyOn(mockAntigravityService, 'refreshToken')
    const updateAccountSpy = vi.spyOn(mockStorageService, 'updateAccount')

    // Token expires in 10 minutes (> 5 min threshold)
    mockAccount.expiresAt = Date.now() + 10 * 60 * 1000

    const operation = vi.fn().mockResolvedValue({ success: true })

    const result = await withAutoRefresh(mockAccount, operation)

    expect(refreshTokenSpy).not.toHaveBeenCalled()
    expect(updateAccountSpy).not.toHaveBeenCalled()
    expect(operation).toHaveBeenCalledWith(mockAccount)
    expect(result).toEqual({ success: true })
  })

  it('should refresh token when token expires in < 5 minutes', async () => {
    const newTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
    }

    const refreshTokenSpy = vi.spyOn(mockAntigravityService, 'refreshToken').mockResolvedValue(newTokens)
    const updateAccountSpy = vi.spyOn(mockStorageService, 'updateAccount').mockResolvedValue(true)

    // Token expires in 4 minutes (< 5 min threshold)
    mockAccount.expiresAt = Date.now() + 4 * 60 * 1000

    const operation = vi.fn().mockResolvedValue({ success: true })

    const result = await withAutoRefresh(mockAccount, operation)

    expect(refreshTokenSpy).toHaveBeenCalledWith(mockAccount.refreshToken)
    expect(updateAccountSpy).toHaveBeenCalledWith('antigravity', mockAccount.id, newTokens)
    
    // Operation should be called with updated account
    expect(operation).toHaveBeenCalledWith(expect.objectContaining({
      ...mockAccount,
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresAt: newTokens.expiresAt
    }))
    
    expect(result).toEqual({ success: true })
  })

  it('should return null when refresh fails', async () => {
    const refreshTokenSpy = vi.spyOn(mockAntigravityService, 'refreshToken').mockResolvedValue(null)
    const updateAccountSpy = vi.spyOn(mockStorageService, 'updateAccount')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Token expires in 2 minutes (< 5 min threshold)
    mockAccount.expiresAt = Date.now() + 2 * 60 * 1000

    const operation = vi.fn()

    const result = await withAutoRefresh(mockAccount, operation)

    expect(refreshTokenSpy).toHaveBeenCalledWith(mockAccount.refreshToken)
    expect(updateAccountSpy).not.toHaveBeenCalled()
    expect(operation).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Antigravity] Token refresh failed for', mockAccount.email)
    expect(result).toBeNull()

    consoleErrorSpy.mockRestore()
  })

  it('should update storage after successful refresh', async () => {
    const newTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: Date.now() + 60 * 60 * 1000
    }

    const refreshTokenSpy = vi.spyOn(mockAntigravityService, 'refreshToken').mockResolvedValue(newTokens)
    const updateAccountSpy = vi.spyOn(mockStorageService, 'updateAccount').mockResolvedValue(true)

    // Token expires in 3 minutes
    mockAccount.expiresAt = Date.now() + 3 * 60 * 1000

    const operation = vi.fn().mockResolvedValue({ data: 'test' })

    await withAutoRefresh(mockAccount, operation)

    expect(updateAccountSpy).toHaveBeenCalledWith('antigravity', mockAccount.id, {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresAt: newTokens.expiresAt
    })
  })

  it('should preserve original function parameters and return value', async () => {
    const operation = vi.fn().mockResolvedValue({ models: ['model-a', 'model-b'], total: 100 })

    // Token is valid (10 minutes remaining)
    mockAccount.expiresAt = Date.now() + 10 * 60 * 1000

    const result = await withAutoRefresh(mockAccount, operation)

    expect(operation).toHaveBeenCalledWith(mockAccount)
    expect(result).toEqual({ models: ['model-a', 'model-b'], total: 100 })
  })

  it('should share a concurrent refresh for the same account and token', async () => {
    const newTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: Date.now() + 60 * 60 * 1000
    }
    let resolveRefresh!: (tokens: typeof newTokens) => void
    const refreshTokenSpy = vi.spyOn(mockAntigravityService, 'refreshToken')
      .mockReturnValue(new Promise(resolve => {
        resolveRefresh = resolve
      }))
    const updateAccountSpy = vi.spyOn(mockStorageService, 'updateAccount').mockResolvedValue(true)
    mockAccount.expiresAt = Date.now() + 2 * 60 * 1000
    const firstOperation = vi.fn().mockResolvedValue('first')
    const secondOperation = vi.fn().mockResolvedValue('second')

    const first = withAutoRefresh(mockAccount, firstOperation)
    const second = withAutoRefresh(mockAccount, secondOperation)
    await vi.waitFor(() => expect(refreshTokenSpy).toHaveBeenCalledTimes(1))
    resolveRefresh(newTokens)

    await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second'])
    expect(updateAccountSpy).toHaveBeenCalledTimes(1)
    expect(firstOperation).toHaveBeenCalledWith(expect.objectContaining(newTokens))
    expect(secondOperation).toHaveBeenCalledWith(expect.objectContaining(newTokens))
  })

  it('should use newer stored tokens instead of refreshing a stale account copy', async () => {
    const storedAccount = {
      ...mockAccount,
      accessToken: 'stored-access-token',
      refreshToken: 'stored-refresh-token',
      expiresAt: Date.now() + 60 * 60 * 1000
    }
    vi.mocked(mockStorageService.getAccounts).mockResolvedValue([storedAccount])
    const refreshTokenSpy = vi.spyOn(mockAntigravityService, 'refreshToken')
    const operation = vi.fn().mockResolvedValue('ok')
    mockAccount.expiresAt = Date.now() + 2 * 60 * 1000

    await expect(withAutoRefresh(mockAccount, operation)).resolves.toBe('ok')

    expect(refreshTokenSpy).not.toHaveBeenCalled()
    expect(operation).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: storedAccount.accessToken,
      refreshToken: storedAccount.refreshToken
    }))
  })

  it('should refresh once and retry when a nominally valid token gets a 401', async () => {
    const newTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: Date.now() + 60 * 60 * 1000
    }
    vi.spyOn(mockAntigravityService, 'refreshToken').mockResolvedValue(newTokens)
    vi.spyOn(mockStorageService, 'updateAccount').mockResolvedValue(true)
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('401 Unauthorized'))
      .mockResolvedValueOnce('ok')

    await expect(withAutoRefresh(mockAccount, operation)).resolves.toBe('ok')

    expect(operation).toHaveBeenCalledTimes(2)
    expect(operation).toHaveBeenLastCalledWith(expect.objectContaining(newTokens))
  })

  it('should export REFRESH_THRESHOLD_MS constant as 5 minutes', () => {
    expect(REFRESH_THRESHOLD_MS).toBe(5 * 60 * 1000)
  })
})
