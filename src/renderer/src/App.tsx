import { useEffect, useRef, useCallback } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { useAntigravityStore } from './stores/useAntigravityStore'
import { useGithubCopilotStore } from './stores/useGithubCopilotStore'
import { useZaiCodingStore } from './stores/useZaiCodingStore'
import { useCodexStore } from './stores/useCodexStore'
import { useOpencodeGoStore } from './stores/useOpencodeGoStore'
import { useOllamaCloudStore } from './stores/useOllamaCloudStore'
import { useAiStudioStore } from './stores/useAiStudioStore'
import { MainLayout } from './components/layout/MainLayout'
import { LockScreen } from './components/LockScreen'
import { Overview } from './pages/Overview'
import { ProviderAccount } from './pages/ProviderAccount'
import { Settings } from './pages/Settings'
import { CustomizationProvider } from './contexts/CustomizationContext'
import { useTheme } from './hooks/useTheme'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { Toaster } from './components/common/Toaster'
import { UpdateNotifier } from './components/common/UpdateNotifier'
import { UpdateSettings } from './components/settings/UpdateSettings'
import type { UsageSnapshot } from '@shared/types'

function App() {
  const { isUnlocked, isLoading, isUpdateRequired, checkAuth } = useAuthStore()
  const { fetchSettings } = useSettingsStore()
  const { fetchAccounts: fetchAntiAccounts, fetchUsage: fetchAntiUsage } = useAntigravityStore()
  const { fetchAccounts: fetchGhAccounts, fetchUsage: fetchGhUsage } = useGithubCopilotStore()
  const { fetchAccounts: fetchZaiAccounts, fetchUsage: fetchZaiUsage } = useZaiCodingStore()
  const { fetchAccounts: fetchCodexAccounts, fetchUsage: fetchCodexUsage } = useCodexStore()
  const { fetchAccounts: fetchOpencodeGoAccounts, fetchUsage: fetchOpencodeGoUsage } = useOpencodeGoStore()
  const { fetchAccounts: fetchOllamaCloudAccounts, fetchUsage: fetchOllamaCloudUsage } = useOllamaCloudStore()
  const { fetchAccounts: fetchAiStudioAccounts, fetchUsage: fetchAiStudioUsage } = useAiStudioStore()

  useTheme()

  const initializedRef = useRef(false)
  const refreshPromiseRef = useRef<Promise<void> | null>(null)

  const refreshAllData = useCallback(() => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current

    // ponytail: coalesces every refresh source; split only if independent refreshes become necessary.
    refreshPromiseRef.current = (async () => {
      await Promise.all([
        fetchAntiAccounts(),
        fetchGhAccounts(),
        fetchZaiAccounts(),
        fetchCodexAccounts(),
        fetchOpencodeGoAccounts(),
        fetchOllamaCloudAccounts(),
        fetchAiStudioAccounts()
      ])
      const [antigravity, copilot, zai, codex, opencodeGo] = await Promise.all([
        fetchAntiUsage(),
        fetchGhUsage(),
        fetchZaiUsage(),
        fetchCodexUsage(),
        fetchOpencodeGoUsage(),
        fetchOllamaCloudUsage(),
        fetchAiStudioUsage()
      ])
      await window.api.notification.checkAndNotify({ antigravity, copilot, zai, codex, opencodeGo }).catch(() => {})
    })().finally(() => {
      refreshPromiseRef.current = null
    })

    return refreshPromiseRef.current
  }, [fetchAntiAccounts, fetchGhAccounts, fetchZaiAccounts, fetchCodexAccounts, fetchOpencodeGoAccounts, fetchOllamaCloudAccounts, fetchAiStudioAccounts, fetchAntiUsage, fetchGhUsage, fetchZaiUsage, fetchCodexUsage, fetchOpencodeGoUsage, fetchOllamaCloudUsage, fetchAiStudioUsage])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isUnlocked) {
      initializedRef.current = false
      return
    }

    if (!initializedRef.current) {
      initializedRef.current = true
      fetchSettings()
      if (document.visibilityState === 'visible') {
        refreshAllData()
      }
    }
  }, [isUnlocked, fetchSettings, refreshAllData])

  useEffect(() => {
    if (isUnlocked) {
      void window.api.app.startBackgroundRefresh()
    } else {
      void window.api.app.stopBackgroundRefresh()
    }
  }, [isUnlocked])

  useEffect(() => {
    window.electron.ipcRenderer.on('app:navigate-to-overview', () => {
      window.location.hash = '/overview'
    })

    window.electron.ipcRenderer.on('app:refresh-all', () => {
      // Only refresh if storage is unlocked to avoid "Storage is locked" errors
      if (isUnlocked) {
        refreshAllData()
      }
    })

    window.electron.ipcRenderer.on('app:usage-updated', (_, snapshot: UsageSnapshot) => {
      if (!isUnlocked) return

      useAntigravityStore.setState({ usageData: snapshot.antigravity })
      useGithubCopilotStore.setState({ usageData: snapshot.githubCopilot })
      useZaiCodingStore.setState({ usageData: snapshot.zaiCoding })
      useCodexStore.setState({ usageData: snapshot.codex })
      useOpencodeGoStore.setState({ usageData: snapshot.opencodeGo })
      useOllamaCloudStore.setState({ usageData: snapshot.ollamaCloud })
      useAiStudioStore.setState({ usageData: snapshot.aiStudio })
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners('app:navigate-to-overview')
      window.electron.ipcRenderer.removeAllListeners('app:refresh-all')
      window.electron.ipcRenderer.removeAllListeners('app:usage-updated')
    }
  }, [isUnlocked, refreshAllData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isUpdateRequired) {
    return (
      <main className="relative flex h-screen items-center justify-center overflow-hidden bg-surface-sunken p-4">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
        />
        <div className="w-full max-w-[560px]">
          <UpdateSettings required />
        </div>
        <Toaster />
      </main>
    )
  }

  if (!isUnlocked) {
    return (
      <>
        <LockScreen />
        <Toaster />
      </>
    )
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <CustomizationProvider>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/overview" replace />} />
              <Route path="overview" element={<Overview />} />
              <Route path="provider/:providerId/:accountId" element={<ProviderAccount />} />
              <Route path="settings" element={<Settings />} />
              {/* Redirect old routes to overview */}
              <Route path="antigravity" element={<Navigate to="/overview" replace />} />
              <Route path="github-copilot" element={<Navigate to="/overview" replace />} />
              <Route path="zai-coding" element={<Navigate to="/overview" replace />} />
              <Route path="codex" element={<Navigate to="/overview" replace />} />
              <Route path="opencode-go" element={<Navigate to="/overview" replace />} />
              <Route path="ollama-cloud" element={<Navigate to="/overview" replace />} />
            </Route>
          </Routes>
        </CustomizationProvider>
      </HashRouter>
      <UpdateNotifier />
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
