import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Settings,
  Lock,
  Package,
  ChevronDown,
  Plus,
  Gauge
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAntigravityStore } from '@/stores/useAntigravityStore'
import { useGithubCopilotStore } from '@/stores/useGithubCopilotStore'
import { useZaiCodingStore } from '@/stores/useZaiCodingStore'
import { useCodexStore } from '@/stores/useCodexStore'
import { useOpencodeGoStore } from '@/stores/useOpencodeGoStore'
import { getProviderById } from '@/constants/providers'
import { AddAccountDialog } from '@/components/common/AddAccountDialog'
import type { ProviderId } from '@/types/customization'

const SIDEBAR_EXPANDED_KEY = 'sidebar-providers-expanded'

interface AccountNavItem {
  id: string
  displayName: string
  providerId: ProviderId
}

export interface MainLayoutOutletContext {
  openAddProvider: () => void
}

export function MainLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { lock, isPasswordSkipped } = useAuthStore()
  
  // Get accounts from all stores
  const { accounts: antiAccounts } = useAntigravityStore()
  const { accounts: ghAccounts } = useGithubCopilotStore()
  const { accounts: zaiAccounts } = useZaiCodingStore()
  const { accounts: codexAccounts } = useCodexStore()
  const { accounts: opencodeGoAccounts } = useOpencodeGoStore()
  
  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  
  // Sidebar expanded state with localStorage persistence
  const [providersExpanded, setProvidersExpanded] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
    return saved !== null ? saved === 'true' : true
  })
  
  useEffect(() => {
    localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(providersExpanded))
  }, [providersExpanded])
  
  // Combine all accounts with provider info
  const allAccounts: AccountNavItem[] = [
    ...antiAccounts.map(a => ({
      id: a.id,
      displayName: a.displayName || a.name || a.email,
      providerId: 'antigravity' as const
    })),
    ...ghAccounts.map(a => ({
      id: a.id,
      displayName: a.displayName || a.name || a.login,
      providerId: 'githubCopilot' as const
    })),
    ...zaiAccounts.map(a => ({
      id: a.id,
      displayName: a.displayName || a.name,
      providerId: 'zaiCoding' as const
    })),
    ...codexAccounts.map(a => ({
      id: a.id,
      displayName: a.displayName || a.email,
      providerId: 'codex' as const
    })),
    ...opencodeGoAccounts.map(a => ({
      id: a.id,
      displayName: a.displayName || a.workspaceName || a.workspaceId,
      providerId: 'opencodeGo' as const
    }))
  ]
  
  // Check if current path is a provider account page
  const isProviderAccountActive = location.pathname.startsWith('/provider/')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[60] -translate-y-20 rounded-md bg-brand px-3 py-2 font-semibold text-brand-foreground shadow-fluent-16 transition-transform focus:translate-y-0"
      >
        {t('common.skipToContent')}
      </a>

      <aside className="flex w-[72px] shrink-0 flex-col border-r bg-surface-sunken md:w-[264px]">
        <div className="flex h-16 items-center gap-3 border-b px-4 md:px-5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand text-brand-foreground shadow-fluent-2">
            <Gauge className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="hidden min-w-0 md:block">
            <h1 className="truncate text-base font-semibold leading-[22px] text-foreground">{t('branding.title')}</h1>
            <p className="truncate text-xs leading-4 text-muted-foreground">{t('branding.subtitle')}</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-2 py-3 md:px-3" aria-label={t('branding.title')}>
          <ul className="space-y-1.5">
            {/* Overview */}
            <li>
              <NavLink
                to="/overview"
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-11 items-center justify-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150 before:absolute before:left-0 before:h-5 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 md:min-h-9 md:justify-start',
                    isActive
                      ? 'bg-accent text-accent-foreground before:opacity-100'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )
                }
                title={t('nav.overview')}
              >
                <LayoutDashboard className="h-5 w-5 shrink-0 md:h-4 md:w-4" aria-hidden="true" />
                <span className="hidden truncate md:block">{t('nav.overview')}</span>
              </NavLink>
            </li>
            
            {/* Providers Collapsible */}
            <li>
              <Collapsible open={providersExpanded} onOpenChange={setProvidersExpanded}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md px-3 text-sm font-medium transition-colors duration-150 md:min-h-9 md:justify-between',
                      isProviderAccountActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                    aria-label={t('nav.providers')}
                  >
                    <span className="flex items-center gap-3">
                      <Package className="h-5 w-5 shrink-0 md:h-4 md:w-4" aria-hidden="true" />
                      <span className="hidden md:block">{t('nav.providers')}</span>
                    </span>
                    <ChevronDown 
                      className={cn(
                        'hidden h-4 w-4 transition-transform duration-200 md:block',
                        providersExpanded && 'rotate-180'
                      )} 
                      aria-hidden="true"
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1 md:ml-5">
                  {/* Account links */}
                  {allAccounts.map((account) => {
                    const provider = getProviderById(account.providerId)
                    const Icon = provider?.icon || Package
                    
                    return (
                      <NavLink
                        key={`${account.providerId}-${account.id}`}
                        to={`/provider/${account.providerId}/${account.id}`}
                        className={({ isActive }) =>
                          cn(
                            'relative flex min-h-11 items-center justify-center gap-3 rounded-md px-3 text-sm transition-colors duration-150 before:absolute before:left-0 before:h-5 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 md:min-h-9 md:justify-start',
                            isActive
                              ? 'bg-accent text-accent-foreground before:opacity-100'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          )
                        }
                        title={`${provider?.name || ''} · ${account.displayName}`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0 md:h-4 md:w-4" aria-hidden="true" />
                        <span className="hidden truncate md:block">{account.displayName}</span>
                      </NavLink>
                    )
                  })}
                  
                  {/* Add Provider button */}
                  <button
                    onClick={() => setShowAddDialog(true)}
                    className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9 md:justify-start"
                    title={t('nav.addProvider')}
                    aria-label={t('nav.addProvider')}
                  >
                    <Plus className="h-5 w-5 md:h-4 md:w-4" aria-hidden="true" />
                    <span className="hidden md:block">{t('nav.addProvider')}</span>
                  </button>
                </CollapsibleContent>
              </Collapsible>
            </li>
            
            {/* Settings */}
            <li>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-11 items-center justify-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150 before:absolute before:left-0 before:h-5 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 md:min-h-9 md:justify-start',
                    isActive
                      ? 'bg-accent text-accent-foreground before:opacity-100'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )
                }
                title={t('nav.settings')}
              >
                <Settings className="h-5 w-5 shrink-0 md:h-4 md:w-4" aria-hidden="true" />
                <span className="hidden md:block">{t('nav.settings')}</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        {!isPasswordSkipped && (
          <div className="border-t p-2 md:p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-muted-foreground md:justify-start"
              onClick={lock}
              title={t('common.lock')}
            >
              <Lock className="h-5 w-5 md:h-4 md:w-4" aria-hidden="true" />
              <span className="hidden md:block">{t('common.lock')}</span>
            </Button>
          </div>
        )}
      </aside>

      <main id="main-content" className="min-w-0 flex-1 overflow-y-auto bg-background" tabIndex={-1}>
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
          <Outlet context={{ openAddProvider: () => setShowAddDialog(true) } satisfies MainLayoutOutletContext} />
        </div>
      </main>
      
      {/* Unified Add Account Dialog */}
      <AddAccountDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />
    </div>
  )
}
