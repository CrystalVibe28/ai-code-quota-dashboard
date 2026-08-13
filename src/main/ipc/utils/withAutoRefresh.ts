import type { AntigravityAccount } from '@shared/types'
import { AntigravityService } from '../../services/providers/antigravity'
import { StorageService } from '../../services/storage'

export const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

let antigravityService: AntigravityService
let storageService: StorageService
type AntigravityTokens = Awaited<ReturnType<AntigravityService['refreshToken']>>
const tokenRefreshes = new Map<string, Promise<AntigravityTokens>>()

export function setServices(agService: AntigravityService, stService: StorageService): void {
  antigravityService = agService
  storageService = stService
  tokenRefreshes.clear()
}

export async function refreshAntigravityTokens(
  account: AntigravityAccount
): Promise<AntigravityTokens> {
  if (!antigravityService) antigravityService = new AntigravityService()
  if (!storageService) storageService = new StorageService()

  const key = `${account.id}:${account.refreshToken}`
  let pending = tokenRefreshes.get(key)
  if (!pending) {
    pending = (async () => {
      const currentAccounts = await storageService.getAccounts('antigravity') as AntigravityAccount[]
      if (Array.isArray(currentAccounts)) {
        const current = currentAccounts.find(value => value.id === account.id)
        if (!current) return null
        if (current.refreshToken !== account.refreshToken) {
          return {
            accessToken: current.accessToken,
            refreshToken: current.refreshToken,
            expiresAt: current.expiresAt
          }
        }
      }

      const newTokens = await antigravityService.refreshToken(account.refreshToken)
      if (!newTokens) return null

      const storedAccounts = await storageService.getAccounts('antigravity') as AntigravityAccount[]
      if (Array.isArray(storedAccounts)) {
        const stored = storedAccounts.find(value => value.id === account.id)
        if (!stored) return null
        if (stored.refreshToken !== account.refreshToken) {
          return {
            accessToken: stored.accessToken,
            refreshToken: stored.refreshToken,
            expiresAt: stored.expiresAt
          }
        }
      }

      await storageService.updateAccount('antigravity', account.id, newTokens)
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
  let refreshed = false

  if (Date.now() > account.expiresAt - REFRESH_THRESHOLD_MS) {
    const newTokens = await refreshAntigravityTokens(account)
    
    if (newTokens) {
      currentAccount = { ...account, ...newTokens }
      refreshed = true
    } else {
      console.error('[Antigravity] Token refresh failed for', account.email)
      return null
    }
  }

  try {
    return await operation(currentAccount)
  } catch (error) {
    if (refreshed || !/\b401\b|unauthorized/i.test(String(error))) throw error

    const newTokens = await refreshAntigravityTokens(account)
    if (!newTokens) return null
    return await operation({ ...account, ...newTokens })
  }
}
