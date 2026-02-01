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
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAntigravityStore } from '@/stores/useAntigravityStore'
import { useGithubCopilotStore } from '@/stores/useGithubCopilotStore'
import { useZaiCodingStore } from '@/stores/useZaiCodingStore'
import { PROVIDERS, getProviderById } from '@/constants/providers'
import { AddAccountDialog } from '@/components/common/AddAccountDialog'
import type { ProviderId } from '@/types/customization'

const SIDEBAR_EXPANDED_KEY = 'sidebar-providers-expanded'

interface AccountNavItem {
  id: string
  displayName: string
  providerId: ProviderId
}

export function MainLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { lock } = useAuthStore()
  
  // Get accounts from all stores
  const { accounts: antiAccounts } = useAntigravityStore()
  const { accounts: ghAccounts } = useGithubCopilotStore()
  const { accounts: zaiAccounts } = useZaiCodingStore()
  
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
    }))
  ]
  
  // Check if current path is a provider account page
  const isProviderAccountActive = location.pathname.startsWith('/provider/')

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-foreground">{t('branding.title')}</h1>
          <p className="text-xs text-muted-foreground mt-1">{t('branding.subtitle')}</p>
        </div>
        
        <nav className="flex-1 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {/* Overview */}
            <li>
              <NavLink
                to="/overview"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
                }
              >
                <LayoutDashboard className="h-4 w-4" />
                {t('nav.overview')}
              </NavLink>
            </li>
            
            {/* Providers Collapsible */}
            <li>
              <Collapsible open={providersExpanded} onOpenChange={setProvidersExpanded}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors',
                      isProviderAccountActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Package className="h-4 w-4" />
                      {t('nav.providers')}
                    </span>
                    <ChevronDown 
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        providersExpanded && 'rotate-180'
                      )} 
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 ml-4 space-y-1">
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
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )
                        }
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{account.displayName}</span>
                      </NavLink>
                    )
                  })}
                  
                  {/* Add Provider button */}
                  <button
                    onClick={() => setShowAddDialog(true)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    {t('nav.addProvider')}
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
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
                }
              >
                <Settings className="h-4 w-4" />
                {t('nav.settings')}
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={lock}
          >
            <Lock className="h-4 w-4" />
            {t('common.lock')}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
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
