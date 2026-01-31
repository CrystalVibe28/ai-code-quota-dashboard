import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Sparkles, 
  Github, 
  Zap, 
  Settings,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/useAuthStore'

const navItems = [
  { to: '/overview', labelKey: 'nav.overview', icon: LayoutDashboard },
  { to: '/antigravity', labelKey: 'nav.antigravity', icon: Sparkles },
  { to: '/github-copilot', labelKey: 'nav.githubCopilot', icon: Github },
  { to: '/zai-coding', labelKey: 'nav.zaiCoding', icon: Zap },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings }
]

export function MainLayout() {
  const { t } = useTranslation()
  const { lock } = useAuthStore()

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-foreground">{t('branding.title')}</h1>
          <p className="text-xs text-muted-foreground mt-1">{t('branding.subtitle')}</p>
        </div>
        
        <nav className="flex-1 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
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
    </div>
  )
}
