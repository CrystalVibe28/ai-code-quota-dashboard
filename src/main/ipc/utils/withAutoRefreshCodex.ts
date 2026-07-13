import type { CodexAccount } from '@shared/types'
import { CodexService } from '../../services/providers/codex'
import { StorageService } from '../../services/storage'

export const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

let codexService: CodexService
let storageService: StorageService

export function setCodexServices(cxService: CodexService, stService: StorageService): void {
  codexService = cxService
  storageService = stService
}

export async function withAutoRefreshCodex<T>(
  account: CodexAccount,
  operation: (account: CodexAccount) => Promise<T>
): Promise<T | null> {
  if (!codexService) {
    codexService = new CodexService()
  }
  if (!storageService) {
    storageService = new StorageService()
  }

  let currentAccount = account

  if (Date.now() > account.expiresAt - REFRESH_THRESHOLD_MS) {
    const newTokens = await codexService.refreshToken(account.refreshToken)

    if (newTokens) {
      await storageService.updateAccount('codex', account.id, {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        idToken: newTokens.idToken,
        expiresAt: newTokens.expiresAt,
        accountId: newTokens.accountId,
        organizationId: newTokens.organizationId,
        planType: newTokens.planType
      })
      currentAccount = { ...account, ...newTokens }
    } else {
      console.error('[Codex] Token refresh failed for', account.email)
      return null
    }
  }

  return await operation(currentAccount)
}
