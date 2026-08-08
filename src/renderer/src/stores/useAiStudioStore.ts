import i18n from 'i18next'
import { ErrorCode } from '@shared/types'
import type {
  AiStudioAccount,
  AiStudioAccountUsage,
  AiStudioLoginSession,
  AiStudioProject
} from '@shared/types'
import { toast } from '@/hooks/useToast'
import { createProviderStore, parseOAuthError } from './createProviderStore'
import { useErrorStore } from './useErrorStore'

interface AiStudioActions {
  login: () => Promise<{ success: boolean; account?: AiStudioLoginSession; error?: string }>
  cancelLogin: () => Promise<boolean>
  reauthorizeAccount: (accountId: string) => Promise<boolean>
  addAccount: (
    session: AiStudioLoginSession,
    project: AiStudioProject,
    displayName: string
  ) => Promise<{ success: boolean; error?: string }>
}

export const useAiStudioStore = createProviderStore<AiStudioAccount, AiStudioAccountUsage, AiStudioActions>(
  {
    providerId: 'aiStudio',
    providerName: 'Google AI Studio',
    fetchUsageApi: () => window.api.aiStudio.fetchAllUsage()
  },
  (set, get) => ({
    cancelLogin: () => window.api.aiStudio.cancelLogin(),

    login: async () => {
      set({ isLoading: true, error: null })
      try {
        const result = await window.api.aiStudio.login()
        set({ isLoading: false, error: result.success ? null : result.error || 'Login failed' })
        if (!result.success) {
          const code = parseOAuthError(result.error)
          if (code !== ErrorCode.OAUTH_CANCELLED) {
            useErrorStore.getState().showError(code, result.error || 'Login failed')
          }
        }
        return result
      } catch (error) {
        const message = String(error)
        set({ isLoading: false, error: message })
        useErrorStore.getState().showError(ErrorCode.OAUTH_FAILED, message)
        return { success: false, error: message }
      }
    },

    reauthorizeAccount: async (accountId) => {
      const account = get().accounts.find(value => value.id === accountId)
      if (!account) {
        const message = i18n.t('aiStudio.reauthorization.accountNotFound')
        set({ error: message })
        useErrorStore.getState().showError(ErrorCode.ACCOUNT_NOT_FOUND, message)
        return false
      }

      const result = await get().login()
      if (!result.success || !result.account) return false

      set({ isLoading: true })
      if (result.account.userId !== account.userId) {
        const message = i18n.t('aiStudio.reauthorization.accountMismatch', { email: account.email })
        set({ isLoading: false, error: message })
        useErrorStore.getState().showError(ErrorCode.OAUTH_FAILED, message)
        return false
      }

      const project = result.account.projects.find(value => value.projectId === account.projectId)
      if (!project) {
        const message = i18n.t('aiStudio.reauthorization.projectUnavailable', {
          project: account.projectName || account.projectId
        })
        set({ isLoading: false, error: message })
        useErrorStore.getState().showError(ErrorCode.API_NOT_FOUND, message)
        return false
      }

      const updated = await get().updateAccount(accountId, {
        email: result.account.email,
        name: result.account.name,
        picture: result.account.picture,
        accessToken: result.account.accessToken,
        refreshToken: result.account.refreshToken,
        expiresAt: result.account.expiresAt,
        projectNumber: project.projectNumber,
        projectName: project.name
      })
      if (!updated) {
        set({ isLoading: false })
        return false
      }

      await get().fetchUsage()
      toast.success(i18n.t('aiStudio.reauthorization.success'))
      return true
    },

    addAccount: async (session, project, displayName) => {
      set({ isLoading: true, error: null })
      try {
        const account: AiStudioAccount = {
          id: `${session.userId}:${project.projectId}`,
          displayName,
          showInOverview: true,
          userId: session.userId,
          email: session.email,
          name: session.name,
          picture: session.picture,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
          projectId: project.projectId,
          projectNumber: project.projectNumber,
          projectName: project.name,
          tier: 'free',
          tierSource: 'system'
        }
        await window.api.storage.saveAccount('aiStudio', account)
        await get().fetchAccounts()
        void get().fetchUsage()
        set({ isLoading: false })
        return { success: true }
      } catch (error) {
        const message = String(error)
        set({ isLoading: false, error: message })
        useErrorStore.getState().showError(ErrorCode.ACCOUNT_SAVE_FAILED, message)
        return { success: false, error: message }
      }
    }
  })
)
