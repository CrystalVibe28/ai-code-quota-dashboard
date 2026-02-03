import { create, StateCreator } from 'zustand'
import type { Account, ProviderId, LoginResult } from '@shared/types'
import { ErrorCode } from '@shared/types'
import { useErrorStore } from './useErrorStore'

/**
 * Base state interface for all provider stores
 */
export interface BaseProviderState<TAccount extends Account, TUsage> {
  accounts: TAccount[]
  usageData: TUsage[]
  isLoading: boolean
  error: string | null
  fetchAccounts: () => Promise<void>
  fetchUsage: () => Promise<void>
  deleteAccount: (accountId: string) => Promise<boolean>
  updateAccount: (accountId: string, data: Partial<TAccount>) => Promise<boolean>
  clearError: () => void
}

/**
 * OAuth provider state extension
 */
export interface OAuthProviderState<TAccount extends Account, TUsage>
  extends BaseProviderState<TAccount, TUsage> {
  login: () => Promise<LoginResult<TAccount>>
}

/**
 * Configuration for creating a provider store
 */
export interface ProviderStoreConfig<TAccount extends Account, TUsage> {
  providerId: ProviderId
  providerName: string
  fetchUsageApi: () => Promise<TUsage[]>
  /**
   * Custom error handler for fetchUsage errors
   * Returns true if error was handled (skip default toast)
   */
  handleUsageError?: (errorMessage: string) => boolean
}

/**
 * OAuth provider configuration
 */
export interface OAuthProviderStoreConfig<TAccount extends Account, TUsage>
  extends ProviderStoreConfig<TAccount, TUsage> {
  loginApi: () => Promise<LoginResult<TAccount>>
  /**
   * Custom OAuth error parser (optional extension)
   */
  parseOAuthErrorExtension?: (error: string) => ErrorCode | null
}

/**
 * Parse OAuth error string to determine error code
 */
export function parseOAuthError(
  error?: string,
  extensionParser?: (error: string) => ErrorCode | null
): ErrorCode {
  if (!error) return ErrorCode.OAUTH_FAILED

  const lowerError = error.toLowerCase()

  // Check extension parser first
  if (extensionParser) {
    const extResult = extensionParser(lowerError)
    if (extResult) return extResult
  }

  if (lowerError.includes('cancel') || lowerError.includes('closed')) {
    return ErrorCode.OAUTH_CANCELLED
  }
  if (lowerError.includes('timeout')) {
    return ErrorCode.OAUTH_TIMEOUT
  }
  if (lowerError.includes('access_denied') || lowerError.includes('access denied')) {
    return ErrorCode.OAUTH_ACCESS_DENIED
  }
  if (lowerError.includes('expired')) {
    return ErrorCode.OAUTH_TOKEN_EXPIRED
  }
  if (lowerError.includes('scope')) {
    return ErrorCode.OAUTH_SCOPE_ERROR
  }

  return ErrorCode.OAUTH_FAILED
}

/**
 * Create base provider actions (shared logic)
 */
function createBaseActions<TAccount extends Account, TUsage>(
  config: ProviderStoreConfig<TAccount, TUsage>,
  set: (partial: Partial<BaseProviderState<TAccount, TUsage>>) => void,
  get: () => BaseProviderState<TAccount, TUsage>
): BaseProviderState<TAccount, TUsage> {
  const { providerId, providerName, fetchUsageApi, handleUsageError } = config

  return {
    accounts: [],
    usageData: [],
    isLoading: false,
    error: null,

    fetchAccounts: async () => {
      try {
        const accounts = await window.api.storage.getAccounts<TAccount>(providerId)
        set({ accounts, error: null })
      } catch (error) {
        const errorMessage = `Failed to fetch ${providerName} accounts`
        set({ error: errorMessage })
        useErrorStore.getState().showError(ErrorCode.STORAGE_READ_FAILED, errorMessage)
      }
    },

    fetchUsage: async () => {
      set({ isLoading: true, error: null })
      try {
        const usageData = await fetchUsageApi()
        set({ usageData, isLoading: false })
      } catch (error) {
        const errorMessage = String(error)
        set({ error: errorMessage, isLoading: false })

        // Use custom error handler if provided
        const handled = handleUsageError?.(errorMessage) ?? false
        if (!handled) {
          useErrorStore.getState().showError(ErrorCode.API_ERROR, 'Failed to fetch usage data')
        }
      }
    },

    deleteAccount: async (accountId: string) => {
      try {
        const result = await window.api.storage.deleteAccount(providerId, accountId)
        if (result) {
          await get().fetchAccounts()
        } else {
          useErrorStore.getState().showError(ErrorCode.ACCOUNT_DELETE_FAILED, 'Failed to delete account')
        }
        return result
      } catch (error) {
        useErrorStore.getState().showError(ErrorCode.ACCOUNT_DELETE_FAILED, String(error))
        return false
      }
    },

    updateAccount: async (accountId: string, data: Partial<TAccount>) => {
      try {
        const result = await window.api.storage.updateAccount(providerId, accountId, data)
        if (result) {
          await get().fetchAccounts()
        } else {
          useErrorStore.getState().showError(ErrorCode.ACCOUNT_UPDATE_FAILED, 'Failed to update account')
        }
        return result
      } catch (error) {
        useErrorStore.getState().showError(ErrorCode.ACCOUNT_UPDATE_FAILED, String(error))
        return false
      }
    },

    clearError: () => {
      set({ error: null })
    }
  }
}

/**
 * Create a base provider store with common CRUD operations
 */
export function createProviderStore<TAccount extends Account, TUsage>(
  config: ProviderStoreConfig<TAccount, TUsage>
) {
  return create<BaseProviderState<TAccount, TUsage>>((set, get) =>
    createBaseActions(config, set, get)
  )
}

/**
 * Create an OAuth provider store with login support
 */
export function createOAuthProviderStore<TAccount extends Account, TUsage>(
  config: OAuthProviderStoreConfig<TAccount, TUsage>
) {
  return create<OAuthProviderState<TAccount, TUsage>>((set, get) => {
    const baseActions = createBaseActions(
      config,
      set as (partial: Partial<BaseProviderState<TAccount, TUsage>>) => void,
      get as () => BaseProviderState<TAccount, TUsage>
    )

    return {
      ...baseActions,

      login: async () => {
        set({ isLoading: true, error: null })
        try {
          const result = await config.loginApi()
          if (result.success) {
            await get().fetchAccounts()
            set({ isLoading: false })
          } else {
            const errorCode = parseOAuthError(result.error, config.parseOAuthErrorExtension)
            set({ error: result.error || null, isLoading: false })

            // Don't show toast for user cancellation
            if (errorCode !== ErrorCode.OAUTH_CANCELLED) {
              useErrorStore.getState().showError(errorCode, result.error || 'Login failed')
            }
          }
          return result
        } catch (error) {
          const errorMessage = String(error)
          set({ error: errorMessage, isLoading: false })
          useErrorStore.getState().showError(ErrorCode.OAUTH_FAILED, errorMessage)
          return { success: false, error: errorMessage }
        }
      }
    }
  })
}

/**
 * Create state creator for extending base store with custom actions
 * Use this when you need to add additional methods beyond the base
 */
export function createBaseStateCreator<TAccount extends Account, TUsage>(
  config: ProviderStoreConfig<TAccount, TUsage>
): StateCreator<BaseProviderState<TAccount, TUsage>> {
  return (set, get) => createBaseActions(config, set, get)
}
