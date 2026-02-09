import { describe, it, expect, vi, beforeEach } from 'vitest'
import { create, StateCreator } from 'zustand'
import {
  createProviderStore,
  createOAuthProviderStore,
  type BaseProviderState,
  type OAuthProviderState,
  type ProviderStoreConfig,
  type OAuthProviderStoreConfig
} from '../createProviderStore'
import type { Account, LoginResult } from '@shared/types'
import { mockWindowApi } from '../../../../test/mocks/window-api'

interface TestAccount extends Account {
  id: string
  name: string
  displayName: string
}

interface TestUsage {
  used: number
  total: number
}

describe('createProviderStore with extensions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWindowApi.storage.getAccounts.mockResolvedValue([])
  })

  it('should merge extension actions into store', async () => {
    const mockUsageData: TestUsage[] = [{ used: 50, total: 100 }]
    const fetchUsageApi = vi.fn().mockResolvedValue(mockUsageData)

    const config: ProviderStoreConfig<TestAccount, TestUsage> = {
      providerId: 'test-provider',
      providerName: 'Test Provider',
      fetchUsageApi
    }

    const useStore = createProviderStore<TestAccount, TestUsage, { customAction: () => string }>(
      config,
      (set, get, baseActions) => ({
        customAction: () => 'custom value'
      })
    )

    const state = useStore.getState()

    expect(state.fetchAccounts).toBeDefined()
    expect(state.fetchUsage).toBeDefined()
    expect(state.deleteAccount).toBeDefined()
    expect(state.updateAccount).toBeDefined()
    expect(state.clearError).toBeDefined()

    expect(state.customAction).toBeDefined()
    expect(state.customAction()).toBe('custom value')
  })

  it('should provide baseActions to extension function', async () => {
    const mockUsageData: TestUsage[] = [{ used: 50, total: 100 }]
    const fetchUsageApi = vi.fn().mockResolvedValue(mockUsageData)

    const config: ProviderStoreConfig<TestAccount, TestUsage> = {
      providerId: 'test-provider',
      providerName: 'Test Provider',
      fetchUsageApi
    }

    let capturedBaseActions: any = null

    const useStore = createProviderStore<TestAccount, TestUsage, { refreshData: () => Promise<void> }>(
      config,
      (set, get, baseActions) => {
        capturedBaseActions = baseActions
        return {
          refreshData: async () => {
            await baseActions.fetchAccounts()
            await baseActions.fetchUsage()
          }
        }
      }
    )

    expect(capturedBaseActions).not.toBeNull()
    expect(capturedBaseActions.fetchAccounts).toBeDefined()
    expect(capturedBaseActions.fetchUsage).toBeDefined()

    await useStore.getState().refreshData()
    expect(mockWindowApi.storage.getAccounts).toHaveBeenCalledWith('test-provider')
    expect(fetchUsageApi).toHaveBeenCalled()
  })

  it('should allow extension actions to access store state via get()', async () => {
    const mockUsageData: TestUsage[] = [{ used: 50, total: 100 }]
    const fetchUsageApi = vi.fn().mockResolvedValue(mockUsageData)

    const config: ProviderStoreConfig<TestAccount, TestUsage> = {
      providerId: 'test-provider',
      providerName: 'Test Provider',
      fetchUsageApi
    }

    const useStore = createProviderStore<TestAccount, TestUsage, { getLoadingState: () => boolean }>(
      config,
      (set, get, baseActions) => ({
        getLoadingState: () => {
          const state = get()
          return state.isLoading
        }
      })
    )

    expect(useStore.getState().getLoadingState()).toBe(false)

    const fetchPromise = useStore.getState().fetchUsage()
    await fetchPromise
    
    expect(useStore.getState().getLoadingState()).toBe(false)
  })

  it('should work without extensions (backwards compatibility)', async () => {
    const mockUsageData: TestUsage[] = [{ used: 50, total: 100 }]
    const fetchUsageApi = vi.fn().mockResolvedValue(mockUsageData)

    const config: ProviderStoreConfig<TestAccount, TestUsage> = {
      providerId: 'test-provider',
      providerName: 'Test Provider',
      fetchUsageApi
    }

    const useStore = createProviderStore<TestAccount, TestUsage>(config)

    const state = useStore.getState()

    expect(state.fetchAccounts).toBeDefined()
    expect(state.fetchUsage).toBeDefined()
    expect(state.deleteAccount).toBeDefined()
    expect(state.updateAccount).toBeDefined()
    expect(state.clearError).toBeDefined()

    await state.fetchUsage()
    expect(fetchUsageApi).toHaveBeenCalled()
  })

  it('should support extensions in createOAuthProviderStore', async () => {
    const mockUsageData: TestUsage[] = [{ used: 50, total: 100 }]
    const fetchUsageApi = vi.fn().mockResolvedValue(mockUsageData)
    const loginApi = vi.fn().mockResolvedValue({ success: true } as LoginResult<TestAccount>)

    const config: OAuthProviderStoreConfig<TestAccount, TestUsage> = {
      providerId: 'test-oauth-provider',
      providerName: 'Test OAuth Provider',
      fetchUsageApi,
      loginApi
    }

    const useStore = createOAuthProviderStore<TestAccount, TestUsage, { customOAuthAction: () => string }>(
      config,
      (set, get, baseActions) => ({
        customOAuthAction: () => 'oauth custom value'
      })
    )

    const state = useStore.getState()

    expect(state.fetchAccounts).toBeDefined()
    expect(state.fetchUsage).toBeDefined()
    expect(state.login).toBeDefined()

    expect(state.customOAuthAction).toBeDefined()
    expect(state.customOAuthAction()).toBe('oauth custom value')
  })

  it('should correctly infer extended store type', () => {
    const mockUsageData: TestUsage[] = [{ used: 50, total: 100 }]
    const fetchUsageApi = vi.fn().mockResolvedValue(mockUsageData)

    const config: ProviderStoreConfig<TestAccount, TestUsage> = {
      providerId: 'test-provider',
      providerName: 'Test Provider',
      fetchUsageApi
    }

    interface CustomExtensions {
      customMethod: (input: string) => number
      anotherMethod: () => Promise<boolean>
    }

    const useStore = createProviderStore<TestAccount, TestUsage, CustomExtensions>(
      config,
      (set, get, baseActions) => ({
        customMethod: (input: string) => input.length,
        anotherMethod: async () => true
      })
    )

    const state = useStore.getState()
    
    const accounts: TestAccount[] = state.accounts
    const usageData: TestUsage[] = state.usageData
    const isLoading: boolean = state.isLoading
    const error: string | null = state.error

    const fetchAccounts: () => Promise<void> = state.fetchAccounts
    const fetchUsage: () => Promise<void> = state.fetchUsage
    const deleteAccount: (accountId: string) => Promise<boolean> = state.deleteAccount
    const updateAccount: (accountId: string, data: Partial<TestAccount>) => Promise<boolean> = state.updateAccount
    const clearError: () => void = state.clearError

    const customMethod: (input: string) => number = state.customMethod
    const anotherMethod: () => Promise<boolean> = state.anotherMethod

    expect(accounts).toBeDefined()
    expect(usageData).toBeDefined()
    expect(isLoading).toBeDefined()
    expect(error).toBeDefined()
    expect(fetchAccounts).toBeDefined()
    expect(fetchUsage).toBeDefined()
    expect(deleteAccount).toBeDefined()
    expect(updateAccount).toBeDefined()
    expect(clearError).toBeDefined()
    expect(customMethod).toBeDefined()
    expect(anotherMethod).toBeDefined()

    expect(state.customMethod('hello')).toBe(5)
  })
})
