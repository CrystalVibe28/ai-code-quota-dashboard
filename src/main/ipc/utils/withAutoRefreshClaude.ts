import type { ClaudeAccount } from '@shared/types'
import { CLAUDE_SIGN_IN_REQUIRED, ClaudeService, type ClaudeTokens } from '../../services/providers/claude'
import { StorageService } from '../../services/storage'

export const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

let claudeService: ClaudeService
let storageService: StorageService
const tokenRefreshes = new Map<string, Promise<ClaudeTokens | null>>()

export function setClaudeServices(clService: ClaudeService, stService: StorageService): void {
  claudeService = clService
  storageService = stService
  tokenRefreshes.clear()
}

function storedTokens(account: ClaudeAccount): ClaudeTokens | null {
  return account.accessToken && account.refreshToken
    ? { accessToken: account.accessToken, refreshToken: account.refreshToken, expiresAt: account.expiresAt ?? 0 }
    : null
}

export async function refreshClaudeTokens(account: ClaudeAccount): Promise<ClaudeTokens | null> {
  if (!claudeService) claudeService = new ClaudeService()
  if (!storageService) storageService = new StorageService()

  const refreshToken = account.refreshToken
  if (!refreshToken) return null

  const key = `${account.id}:${refreshToken}`
  let pending = tokenRefreshes.get(key)
  if (!pending) {
    pending = (async () => {
      // Refresh tokens rotate, so a token already replaced in storage must not be spent again.
      const currentAccounts = await storageService.getAccounts('claude') as ClaudeAccount[]
      if (Array.isArray(currentAccounts)) {
        const current = currentAccounts.find(value => value.id === account.id)
        if (!current) return null
        if (current.refreshToken !== refreshToken) return storedTokens(current)
      }

      const newTokens = await claudeService.refreshToken(refreshToken)
      if (!newTokens) return null

      const storedAccounts = await storageService.getAccounts('claude') as ClaudeAccount[]
      if (Array.isArray(storedAccounts)) {
        const stored = storedAccounts.find(value => value.id === account.id)
        if (!stored) return null
        if (stored.refreshToken !== refreshToken) return storedTokens(stored)
      }

      await storageService.updateAccount('claude', account.id, newTokens)
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

export async function withAutoRefreshClaude<T>(
  account: ClaudeAccount,
  operation: (account: ClaudeAccount) => Promise<T>
): Promise<T | null> {
  if (!account.accessToken || !account.refreshToken) throw new Error(CLAUDE_SIGN_IN_REQUIRED)

  let currentAccount = account
  let refreshed = false

  if (Date.now() > (account.expiresAt ?? 0) - REFRESH_THRESHOLD_MS) {
    const newTokens = await refreshClaudeTokens(account)

    if (newTokens) {
      currentAccount = { ...account, ...newTokens }
      refreshed = true
    } else {
      console.error('[Claude] Token refresh failed for', account.email)
      return null
    }
  }

  try {
    return await operation(currentAccount)
  } catch (error) {
    if (refreshed || !/\b401\b|unauthorized/i.test(String(error))) throw error

    const newTokens = await refreshClaudeTokens(account)
    if (!newTokens) return null
    return await operation({ ...account, ...newTokens })
  }
}
