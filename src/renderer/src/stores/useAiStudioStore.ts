import type {
  AiStudioAccount,
  AiStudioAccountUsage,
  AiStudioLoginSession,
  AiStudioProject
} from '@shared/types'
import { ErrorCode } from '@shared/types'
import { createProviderStore, parseOAuthError } from './createProviderStore'
import { useErrorStore } from './useErrorStore'

interface AiStudioActions {
  login: () => Promise<{ success: boolean; account?: AiStudioLoginSession; error?: string }>
  cancelLogin: () => Promise<boolean>
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
