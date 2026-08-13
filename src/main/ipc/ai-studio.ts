import { ipcMain } from 'electron'
import type { AiStudioAccount, AiStudioAccountUsage } from '@shared/types'
import { AiStudioService } from '../services/providers/ai-studio'
import { StorageService } from '../services/storage'
import { UsageDataService } from '../services/usage-data'
import { singleFlight } from './utils/singleFlight'

const storageService = new StorageService()
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000
let activeLoginService: AiStudioService | null = null

function createAiStudioService(): AiStudioService {
  const credentials = storageService.getAiStudioOAuthCredentials()
  return new AiStudioService(credentials?.clientId, credentials?.clientSecret)
}

async function getFreshAccount(account: AiStudioAccount, service: AiStudioService): Promise<AiStudioAccount> {
  if (Date.now() <= account.expiresAt - REFRESH_THRESHOLD_MS) return account

  const tokens = await service.refreshToken(account.refreshToken)
  if (!tokens) throw new Error('Google OAuth token refresh failed')
  await storageService.updateAccount('aiStudio', account.id, tokens)
  return { ...account, ...tokens }
}

async function fetchAccountUsage(account: AiStudioAccount, service: AiStudioService) {
  const freshAccount = await getFreshAccount(account, service)
  const usage = await service.fetchUsage(freshAccount)
  if (usage.tier !== freshAccount.tier || usage.tierSource !== freshAccount.tierSource) {
    await storageService.updateAccount('aiStudio', freshAccount.id, {
      tier: usage.tier,
      tierSource: usage.tierSource
    })
  }
  return usage
}

async function fetchAllAiStudioUsageInner(): Promise<AiStudioAccountUsage[]> {
  const startedAt = Date.now()
  try {
    const accounts = await storageService.getAccounts('aiStudio') as AiStudioAccount[]
    const service = createAiStudioService()
    const results = await Promise.all(accounts.map(async (account): Promise<AiStudioAccountUsage> => {
      try {
        const usage = await fetchAccountUsage(account, service)
        return { accountId: account.id, name: account.displayName, usage }
      } catch (error) {
        return { accountId: account.id, name: account.displayName, usage: null, error: String(error) }
      }
    }))
    return UsageDataService.getInstance()
      .recordProvider('aiStudio', results, Date.now(), startedAt)
  } catch (error) {
    console.error('[AI Studio] fetch-all-usage error:', error)
    UsageDataService.getInstance().recordProviderFailure('aiStudio', Date.now(), startedAt)
    return []
  }
}

export const fetchAllAiStudioUsage = singleFlight(fetchAllAiStudioUsageInner)

export function registerAiStudioHandlers(): void {
  ipcMain.handle('ai-studio:has-oauth-credentials', () => storageService.hasAiStudioOAuthCredentials())

  ipcMain.handle('ai-studio:save-oauth-credentials', (_, clientId: unknown, clientSecret: unknown) => {
    if (typeof clientId !== 'string' || typeof clientSecret !== 'string') return false
    return storageService.saveAiStudioOAuthCredentials(clientId, clientSecret)
  })

  ipcMain.handle('ai-studio:delete-oauth-credentials', () => {
    activeLoginService?.cancelLogin()
    activeLoginService = null
    return storageService.deleteAiStudioOAuthCredentials()
  })

  ipcMain.handle('ai-studio:login', async () => {
    if (activeLoginService) return { success: false, error: 'Login already in progress' }

    const credentials = storageService.getAiStudioOAuthCredentials()
    if (!credentials) return { success: false, error: 'Google OAuth client is not configured' }

    const service = new AiStudioService(credentials.clientId, credentials.clientSecret)
    activeLoginService = service
    try {
      return await service.login()
    } finally {
      if (activeLoginService === service) activeLoginService = null
    }
  })
  ipcMain.handle('ai-studio:cancel-login', () => activeLoginService?.cancelLogin() ?? false)

  ipcMain.handle('ai-studio:refresh-token', async (_, accountId: string) => {
    try {
      const accounts = await storageService.getAccounts('aiStudio') as AiStudioAccount[]
      const account = accounts.find(value => value.id === accountId)
      if (!account) return false

      const service = createAiStudioService()
      const tokens = await service.refreshToken(account.refreshToken)
      return tokens ? storageService.updateAccount('aiStudio', accountId, tokens) : false
    } catch {
      return false
    }
  })

  ipcMain.handle('ai-studio:fetch-usage', async (_, accountId: string) => {
    const accounts = await storageService.getAccounts('aiStudio') as AiStudioAccount[]
    const account = accounts.find(value => value.id === accountId)
    if (!account) return null
    return fetchAccountUsage(account, createAiStudioService())
  })

  ipcMain.handle('ai-studio:fetch-all-usage', fetchAllAiStudioUsage)
}
