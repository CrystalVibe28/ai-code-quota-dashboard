import { describe, it, expect } from 'vitest'
import type { ProviderAdapter } from '../provider'

describe('ProviderAdapter', () => {
  it('should allow fetchUsage-only implementation (minimal implementation)', () => {
    // This test verifies that ProviderAdapter can be implemented with only fetchUsage
    type StringCredential = string
    type NumericUsage = number

    const minimalAdapter: ProviderAdapter<StringCredential, NumericUsage> = {
      fetchUsage: async (credential: StringCredential): Promise<NumericUsage> => {
        return 100
      }
    }

    expect(minimalAdapter).toBeDefined()
    expect(minimalAdapter.fetchUsage).toBeDefined()
    expect(minimalAdapter.refreshToken).toBeUndefined()
    expect(minimalAdapter.login).toBeUndefined()
    expect(minimalAdapter.validateCredential).toBeUndefined()
  })

  it('should allow full implementation with all optional methods', () => {
    // This test verifies that ProviderAdapter accepts all optional methods
    interface AccountCredential {
      accessToken: string
      refreshToken: string
    }

    interface UsageData {
      used: number
      limit: number
    }

    const fullAdapter: ProviderAdapter<AccountCredential, UsageData> = {
      fetchUsage: async (credential: AccountCredential): Promise<UsageData> => {
        return { used: 50, limit: 100 }
      },
      refreshToken: async (
        refreshToken: string
      ): Promise<{ accessToken: string; refreshToken: string } | null> => {
        if (refreshToken.length > 0) {
          return {
            accessToken: 'new_access',
            refreshToken: 'new_refresh'
          }
        }
        return null
      },
      login: async (): Promise<{ success: boolean }> => {
        return { success: true }
      },
      validateCredential: async (credential: AccountCredential): Promise<boolean> => {
        return credential.accessToken.length > 0
      }
    }

    expect(fullAdapter).toBeDefined()
    expect(fullAdapter.fetchUsage).toBeDefined()
    expect(fullAdapter.refreshToken).toBeDefined()
    expect(fullAdapter.login).toBeDefined()
    expect(fullAdapter.validateCredential).toBeDefined()
  })
})
