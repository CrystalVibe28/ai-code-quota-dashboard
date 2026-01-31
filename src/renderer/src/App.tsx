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
import { Antigravity } from './pages/Antigravity'
import { GithubCopilot } from './pages/GithubCopilot'
import { ZaiCoding } from './pages/ZaiCoding'
import { Settings } from './pages/Settings'
import { CustomizationProvider } from './contexts/CustomizationContext'
import { useTheme } from './hooks/useTheme'

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
    return <LockScreen />
  }

  return (
    <HashRouter>
      <CustomizationProvider>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="antigravity" element={<Antigravity />} />
            <Route path="github-copilot" element={<GithubCopilot />} />
            <Route path="zai-coding" element={<ZaiCoding />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </CustomizationProvider>
    </HashRouter>
  )
}

export default App
