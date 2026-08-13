import type { CodexAccount } from '@shared/types'
import { CodexService } from '../../services/providers/codex'
import { StorageService } from '../../services/storage'

export const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

let codexService: CodexService
let storageService: StorageService
type CodexTokens = Awaited<ReturnType<CodexService['refreshToken']>>
const tokenRefreshes = new Map<string, Promise<CodexTokens>>()

export function setCodexServices(cxService: CodexService, stService: StorageService): void {
  codexService = cxService
  storageService = stService
  tokenRefreshes.clear()
}

export async function refreshCodexTokens(account: CodexAccount): Promise<CodexTokens> {
  if (!codexService) codexService = new CodexService()
  if (!storageService) storageService = new StorageService()

  const key = `${account.id}:${account.refreshToken}`
  let pending = tokenRefreshes.get(key)
  if (!pending) {
    pending = (async () => {
      const currentAccounts = await storageService.getAccounts('codex') as CodexAccount[]
      if (Array.isArray(currentAccounts)) {
        const current = currentAccounts.find(value => value.id === account.id)
        if (!current) return null
        if (current.refreshToken !== account.refreshToken) {
          return {
            accessToken: current.accessToken,
            refreshToken: current.refreshToken,
            idToken: current.idToken,
            expiresAt: current.expiresAt,
            accountId: current.accountId,
            organizationId: current.organizationId,
            planType: current.planType
          }
        }
      }

      const newTokens = await codexService.refreshToken(account.refreshToken)
      if (!newTokens) return null

      const storedAccounts = await storageService.getAccounts('codex') as CodexAccount[]
      if (Array.isArray(storedAccounts)) {
        const stored = storedAccounts.find(value => value.id === account.id)
        if (!stored) return null
        if (stored.refreshToken !== account.refreshToken) {
          return {
            accessToken: stored.accessToken,
            refreshToken: stored.refreshToken,
            idToken: stored.idToken,
            expiresAt: stored.expiresAt,
            accountId: stored.accountId,
            organizationId: stored.organizationId,
            planType: stored.planType
          }
        }
      }

      await storageService.updateAccount('codex', account.id, {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        idToken: newTokens.idToken,
        expiresAt: newTokens.expiresAt,
        accountId: newTokens.accountId,
        organizationId: newTokens.organizationId,
        planType: newTokens.planType
      })
      return newTokens
    })()
    tokenRefreshes.set(key, pending)
  }

  try {
    return await pending
  } finally {
    if (tokenRefreshes.get(key) === pending) tokenRefreshes.delete(key)
  }
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
  let refreshed = false

  if (Date.now() > account.expiresAt - REFRESH_THRESHOLD_MS) {
    const newTokens = await refreshCodexTokens(account)

    if (newTokens) {
      currentAccount = { ...account, ...newTokens }
      refreshed = true
    } else {
      console.error('[Codex] Token refresh failed for', account.email)
      return null
    }
  }

  try {
    return await operation(currentAccount)
  } catch (error) {
    if (refreshed || !/\b401\b|unauthorized/i.test(String(error))) throw error

    const newTokens = await refreshCodexTokens(account)
    if (!newTokens) return null
    return await operation({ ...account, ...newTokens })
  }
}
