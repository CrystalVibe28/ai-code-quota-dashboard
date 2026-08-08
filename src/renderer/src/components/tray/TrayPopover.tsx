import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock3, LockKeyhole, PanelTopOpen } from 'lucide-react'
import { PROVIDERS } from '@/constants/providers'
import { ACCENT_COLORS } from '@/constants/customization'
import { getProgressColor, getQuotaColor, formatResetTime } from '@/lib/utils'
import { getTrayQuotaItems } from '@/lib/trayUsage'
import type {
  ProviderId,
  TrayPopoverViewModel
} from '@shared/types'

export function TrayPopover() {
  const { t, i18n } = useTranslation()
  const [viewModel, setViewModel] = useState<TrayPopoverViewModel | null>(null)
  const [activeProvider, setActiveProvider] = useState<ProviderId>('antigravity')
  const [selectedAccounts, setSelectedAccounts] = useState<Partial<Record<ProviderId, string>>>({})
  const [loadFailed, setLoadFailed] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const next = await window.trayApi.getViewModel()
      setViewModel(next)
      setLoadFailed(false)
      if (next.language !== i18n.language) void i18n.changeLanguage(next.language)
    } catch {
      setLoadFailed(true)
    }
  }, [i18n])

  useEffect(() => {
    void loadData()
    const unsubscribe = window.trayApi.onDataUpdated(() => {
      void loadData()
    })
    const handleFocus = (): void => {
      void loadData()
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') window.trayApi.hide()
    }
    window.addEventListener('focus', handleFocus)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      unsubscribe()
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [loadData])

  useEffect(() => {
    if (!viewModel) return
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const accent = ACCENT_COLORS.find(color => color.id === viewModel.accentColor)
    const applyTheme = (): void => {
      const isDark = viewModel.theme === 'dark' ||
        (viewModel.theme === 'system' && mediaQuery.matches)
      root.classList.remove('light', 'dark')
      root.classList.add(isDark ? 'dark' : 'light')
      if (accent) {
        root.style.setProperty('--primary', isDark ? accent.darkValue : accent.value)
        root.style.setProperty('--ring', isDark ? accent.darkValue : accent.value)
        root.style.setProperty('--brand-background', accent.value)
      }
    }
    applyTheme()
    if (viewModel.theme !== 'system') return
    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [viewModel])

  const providers = useMemo(() => {
    if (!viewModel) return []
    return PROVIDERS.filter(provider => viewModel.cache.providers[provider.id].length > 0)
  }, [viewModel])

  useEffect(() => {
    if (providers.length > 0 && !providers.some(provider => provider.id === activeProvider)) {
      setActiveProvider(providers[0].id)
    }
  }, [activeProvider, providers])

  const accounts = viewModel?.cache.providers[activeProvider] ?? []
  const activeAccount = accounts.find(account => account.accountId === selectedAccounts[activeProvider]) ??
    accounts[0]
  const quotaItems = useMemo(
    () => getTrayQuotaItems(activeProvider, activeAccount?.usage, t),
    [activeAccount, activeProvider, t]
  )
  const lastUpdated = viewModel?.cache.updatedAt
    ? new Intl.DateTimeFormat(i18n.language, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(viewModel.cache.updatedAt)
    : t('trayPopover.neverUpdated')

  const renderEmptyState = (title: string, description: string) => (
    <div className="grid flex-1 place-items-center px-8 text-center">
      <div>
        <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-secondary text-muted-foreground">
          <Clock3 className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  )

  return (
    <main className="flex h-screen flex-col overflow-hidden border border-border bg-popover text-popover-foreground shadow-fluent-16">
      <header className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold leading-6">{t('trayPopover.title')}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('trayPopover.lastUpdated', { time: lastUpdated })}
            </p>
          </div>
          <span
            className={`mt-1 h-2 w-2 rounded-full ${
              viewModel && !viewModel.locked ? 'bg-success' : 'bg-muted-foreground'
            }`}
            title={t('trayPopover.localCache')}
            aria-label={t('trayPopover.localCache')}
          />
        </div>
      </header>

      {viewModel?.locked ? (
        <div className="grid flex-1 place-items-center px-8 text-center">
          <div>
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-secondary text-muted-foreground">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-semibold">{t('trayPopover.lockedTitle')}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t('trayPopover.lockedDescription')}
            </p>
          </div>
        </div>
      ) : providers.length > 0 ? (
        <>
          <nav
            className="flex items-center gap-1 overflow-x-auto border-b bg-surface-sunken px-3 py-2"
            aria-label={t('trayPopover.providers')}
          >
            {providers.map(provider => {
              const Icon = provider.icon
              const isActive = provider.id === activeProvider
              return (
                <button
                  key={provider.id}
                  type="button"
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-fluent-2'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                  title={provider.name}
                  aria-label={provider.name}
                  aria-pressed={isActive}
                  onClick={() => setActiveProvider(provider.id)}
                  onFocus={() => setActiveProvider(provider.id)}
                  onMouseEnter={() => setActiveProvider(provider.id)}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              )
            })}
          </nav>

          <section className="flex min-h-0 flex-1 flex-col" aria-live="polite">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">
                  {PROVIDERS.find(provider => provider.id === activeProvider)?.name}
                </h2>
                {accounts.length === 1 && (
                  <p className="truncate text-xs text-muted-foreground">{activeAccount?.name}</p>
                )}
              </div>
              {accounts.length > 1 && (
                <label className="min-w-0 max-w-[190px]">
                  <span className="sr-only">{t('trayPopover.account')}</span>
                  <select
                    className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                    value={activeAccount?.accountId}
                    onChange={event => setSelectedAccounts(current => ({
                      ...current,
                      [activeProvider]: event.target.value
                    }))}
                  >
                    {accounts.map(account => (
                      <option key={account.accountId} value={account.accountId}>{account.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {quotaItems.length > 0 ? (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {quotaItems.map(item => {
                  const percentage = item.percentage
                  const percentageText = percentage === undefined ? item.detail : `${Math.round(percentage)}%`
                  return (
                    <div key={item.id} className="rounded-md border bg-card px-3 py-2.5 shadow-fluent-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold leading-5" title={item.label}>
                            {item.label}
                          </p>
                          {item.resetTime && (
                            <p className="text-[11px] leading-4 text-muted-foreground">
                              {t('trayPopover.resets', {
                                time: formatResetTime(item.resetTime, t, 'relative', i18n.language)
                              })}
                            </p>
                          )}
                        </div>
                        <span className={`font-data shrink-0 text-sm font-semibold ${
                          percentage === undefined ? 'text-foreground' : getQuotaColor(percentage)
                        }`}>
                          {percentageText}
                        </span>
                      </div>
                      {percentage !== undefined && (
                        <div
                          className="mt-2 h-1 overflow-hidden rounded-full bg-secondary"
                          role="progressbar"
                          aria-label={`${item.label}: ${percentageText}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(percentage)}
                        >
                          <div
                            className={`h-full rounded-full ${getProgressColor(percentage)}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      )}
                      {percentage !== undefined && item.detail && (
                        <p className="mt-1 text-right font-data text-[10px] text-muted-foreground">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : renderEmptyState(
              activeAccount?.error ? t('trayPopover.unavailableTitle') : t('trayPopover.noQuotaTitle'),
              activeAccount?.error ? t('trayPopover.unavailableDescription') : t('trayPopover.noQuotaDescription')
            )}
          </section>
        </>
      ) : viewModel ? renderEmptyState(
        t('trayPopover.noAccountsTitle'),
        t('trayPopover.noAccountsDescription')
      ) : renderEmptyState(
        loadFailed ? t('trayPopover.unavailableTitle') : t('common.loading'),
        loadFailed ? t('trayPopover.unavailableDescription') : ''
      )}

      <footer className="border-t bg-surface-sunken p-3">
        <button
          type="button"
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-fluent-2 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => window.trayApi.openMain()}
        >
          <PanelTopOpen className="h-4 w-4" aria-hidden="true" />
          {t('trayPopover.openDashboard')}
        </button>
      </footer>
    </main>
  )
}
