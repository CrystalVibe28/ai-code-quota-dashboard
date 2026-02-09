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

  it('should export REFRESH_THRESHOLD_MS constant as 5 minutes', () => {
    expect(REFRESH_THRESHOLD_MS).toBe(5 * 60 * 1000)
  })
})
