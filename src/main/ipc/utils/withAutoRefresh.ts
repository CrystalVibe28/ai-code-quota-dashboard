import type { AntigravityAccount } from '@shared/types'
import { AntigravityService } from '../../services/providers/antigravity'
import { StorageService } from '../../services/storage'

export const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

let antigravityService: AntigravityService
let storageService: StorageService

export function setServices(agService: AntigravityService, stService: StorageService): void {
  antigravityService = agService
  storageService = stService
}

export async function withAutoRefresh<T>(
  account: AntigravityAccount,
  operation: (account: AntigravityAccount) => Promise<T>
): Promise<T | null> {
  if (!antigravityService) {
    antigravityService = new AntigravityService()
  }
  if (!storageService) {
    storageService = new StorageService()
  }

  let currentAccount = account

  if (Date.now() > account.expiresAt - REFRESH_THRESHOLD_MS) {
    const newTokens = await antigravityService.refreshToken(account.refreshToken)
    
    if (newTokens) {
      await storageService.updateAccount('antigravity', account.id, {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: newTokens.expiresAt
      })
      currentAccount = { ...account, ...newTokens }
    } else {
      console.error('[Antigravity] Token refresh failed for', account.email)
      return null
    }
  }

  return await operation(currentAccount)
}
