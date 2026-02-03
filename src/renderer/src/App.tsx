import { useEffect, useRef, useCallback } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { useAntigravityStore } from './stores/useAntigravityStore'
import { useGithubCopilotStore } from './stores/useGithubCopilotStore'
import { useZaiCodingStore } from './stores/useZaiCodingStore'
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

function App() {
  const { isUnlocked, isLoading, checkAuth } = useAuthStore()
  const { settings, fetchSettings } = useSettingsStore()
  const { fetchAccounts: fetchAntiAccounts, fetchUsage: fetchAntiUsage } = useAntigravityStore()
  const { fetchAccounts: fetchGhAccounts, fetchUsage: fetchGhUsage } = useGithubCopilotStore()
  const { fetchAccounts: fetchZaiAccounts, fetchUsage: fetchZaiUsage } = useZaiCodingStore()

  useTheme()

  const initializedRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

const refreshAllData = useCallback(async () => {
    await Promise.all([
      fetchAntiAccounts(),
      fetchGhAccounts(),
      fetchZaiAccounts()
    ])
    await Promise.all([
      fetchAntiUsage(),
      fetchGhUsage(),
      fetchZaiUsage()
    ])
    // Trigger notification check after refreshing data
    window.api.notification.triggerCheck().catch(() => {
      // Silently ignore notification check failures
    })
  }, [fetchAntiAccounts, fetchGhAccounts, fetchZaiAccounts, fetchAntiUsage, fetchGhUsage, fetchZaiUsage])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (isUnlocked && !initializedRef.current) {
      initializedRef.current = true
      fetchSettings()
      refreshAllData()
    }
  }, [isUnlocked, fetchSettings, refreshAllData])

  useEffect(() => {
    if (!isUnlocked) return

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(refreshAllData, settings.refreshInterval * 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isUnlocked, settings.refreshInterval, refreshAllData])

  useEffect(() => {
    if (isUnlocked) {
      window.api.app.stopBackgroundRefresh()
    }
  }, [isUnlocked])

  useEffect(() => {
    window.electron.ipcRenderer.on('app:navigate-to-overview', () => {
      window.location.hash = '/overview'
    })

    window.electron.ipcRenderer.on('app:refresh-all', () => {
      refreshAllData()
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners('app:navigate-to-overview')
      window.electron.ipcRenderer.removeAllListeners('app:refresh-all')
    }
  }, [refreshAllData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
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
