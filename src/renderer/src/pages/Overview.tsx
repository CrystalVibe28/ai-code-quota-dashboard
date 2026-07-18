import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { RefreshCw, AlertTriangle, Info, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UsageCard } from '@/components/common/UsageCard'
import { AiStudioLimitCard } from '@/components/common/AiStudioLimitCard'
import { ErrorCard } from '@/components/common/ErrorCard'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import type { MainLayoutOutletContext } from '@/components/layout/MainLayout'
import { useAntigravityStore } from '@/stores/useAntigravityStore'
import { useGithubCopilotStore } from '@/stores/useGithubCopilotStore'
import { useZaiCodingStore } from '@/stores/useZaiCodingStore'
import { useCodexStore } from '@/stores/useCodexStore'
import { useOpencodeGoStore } from '@/stores/useOpencodeGoStore'
import { useAiStudioStore } from '@/stores/useAiStudioStore'
import { useCustomization } from '@/contexts/CustomizationContext'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { getQuotaGridClassName } from '@/constants/customization'
import { getProviderById } from '@/constants/providers'
import type { ProviderId } from '@/types/customization'
import type { ZaiLimit } from '@shared/types'
import { getAntigravityQuotaType } from '@shared/antigravityQuota'
import { getZaiQuotaType } from '@shared/zaiQuota'
import { getCodexWindowLabel } from '@/lib/codexQuota'
import { cn } from '@/lib/utils'

export function Overview() {
  const { t } = useTranslation()
  const outletContext = useOutletContext<MainLayoutOutletContext | null>()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const copilotLabelMap: Record<string, string> = {
    chat: 'Chat messages',
    completions: 'Code completions',
    premium_interactions: 'Premium requests'
  }

  const getCopilotLabel = (key: string) => copilotLabelMap[key] ?? key.replace(/_/g, ' ')

  const getAntigravityQuotaLabel = (modelName: string) => {
    const quotaType = getAntigravityQuotaType(modelName)
    return quotaType ? t(`antigravity.quotaTypes.${quotaType}`) : modelName
  }

  const getZaiLimitLabel = (limit: ZaiLimit) => {
    const quotaType = getZaiQuotaType(limit)
    return quotaType ? t(`zaiCoding.limits.${quotaType}`) : limit.type.replace(/_/g, ' ')
  }
  
  const { accounts: antiAccounts, usageData: antiUsage, fetchAccounts: fetchAntiAccounts, fetchUsage: fetchAntiUsage } = useAntigravityStore()
  const { accounts: ghAccounts, usageData: ghUsage, fetchAccounts: fetchGhAccounts, fetchUsage: fetchGhUsage } = useGithubCopilotStore()
  const { accounts: zaiAccounts, usageData: zaiUsage, fetchAccounts: fetchZaiAccounts, fetchUsage: fetchZaiUsage } = useZaiCodingStore()
  const { accounts: codexAccounts, usageData: codexUsage, fetchAccounts: fetchCodexAccounts, fetchUsage: fetchCodexUsage } = useCodexStore()
  const { accounts: opencodeGoAccounts, usageData: opencodeGoUsage, fetchAccounts: fetchOpencodeGoAccounts, fetchUsage: fetchOpencodeGoUsage } = useOpencodeGoStore()
  const { accounts: aiStudioAccounts, usageData: aiStudioUsage, fetchAccounts: fetchAiStudioAccounts, fetchUsage: fetchAiStudioUsage } = useAiStudioStore()
  
  const { global, getSortedProviders, getCardConfig, isCardVisible } = useCustomization()
  const { providers, updateProvider } = useCustomizationStore()
  const isCompactOverview = global.overviewLayout === 'compact'
  const compactFallbackClassName = isCompactOverview ? 'rounded-none border-0 shadow-none' : undefined

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([fetchAntiAccounts(), fetchGhAccounts(), fetchZaiAccounts(), fetchCodexAccounts(), fetchOpencodeGoAccounts(), fetchAiStudioAccounts()])
      const [antigravity, copilot, zai, codex, opencodeGo] = await Promise.all([
        fetchAntiUsage(),
        fetchGhUsage(),
        fetchZaiUsage(),
        fetchCodexUsage(),
        fetchOpencodeGoUsage(),
        fetchAiStudioUsage()
      ])
      await window.api.notification.checkAndNotify({ antigravity, copilot, zai, codex, opencodeGo }).catch(() => {})
      setRefreshKey(prev => prev + 1)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchAntiAccounts, fetchGhAccounts, fetchZaiAccounts, fetchCodexAccounts, fetchOpencodeGoAccounts, fetchAiStudioAccounts, fetchAntiUsage, fetchGhUsage, fetchZaiUsage, fetchCodexUsage, fetchOpencodeGoUsage, fetchAiStudioUsage])

  const visibleAntiAccounts = antiAccounts.filter(a => a.showInOverview)
  const visibleGhAccounts = ghAccounts.filter(a => a.showInOverview)
  const visibleZaiAccounts = zaiAccounts.filter(a => a.showInOverview)
  const visibleCodexAccounts = codexAccounts.filter(a => a.showInOverview)
  const visibleOpencodeGoAccounts = opencodeGoAccounts.filter(a => a.showInOverview)
  const visibleAiStudioAccounts = aiStudioAccounts.filter(a => a.showInOverview)

  const hasLowQuota = (percentage: number) => percentage <= global.lowQuotaThreshold
  
  const shouldShowCard = (percentage: number, isUnlimited: boolean) => {
    if (global.hideUnlimitedQuota && isUnlimited) return false
    return true
  }

  const getGridClass = (providerId: ProviderId) => {
    const cols = providers[providerId]?.gridColumns ?? global.gridColumns
    const cardSize = providers[providerId]?.cardSize ?? global.cardSize
    return getQuotaGridClassName(cols, cardSize)
  }

  const toggleCollapse = (providerId: ProviderId) => {
    updateProvider(providerId, { collapsed: !providers[providerId]?.collapsed })
  }

  const renderAntigravityCards = () => {
    return antiUsage.flatMap((accountUsage) => {
      const account = visibleAntiAccounts.find(a => a.id === accountUsage.accountId)
      if (!account) return []

      if (accountUsage.error && !accountUsage.usage) {
        const cardId = `antigravity-${accountUsage.accountId}-error`
        return [
          <ErrorCard
            key={cardId}
            title={t('nav.antigravity')}
            subtitle={account.displayName || accountUsage.name}
            errorMessage={accountUsage.error}
            cardSize={isCompactOverview ? 'compact' : undefined}
            className={compactFallbackClassName}
            onRetry={refreshAll}
          />
        ]
      }

      if (!accountUsage.usage) return []
      
      return accountUsage.usage.map((model: any) => {
        const cardId = `antigravity-${accountUsage.accountId}-${model.modelName}`
        const percentage = model.remainingFraction * 100
        if (!isCardVisible('antigravity', cardId)) return null
        if (!shouldShowCard(percentage, false)) return null
        
        const config = getCardConfig('antigravity', cardId)
        return (
          <UsageCard
            key={cardId}
            title={getAntigravityQuotaLabel(model.modelName)}
            subtitle={account.displayName || accountUsage.name}
            percentage={percentage}
            resetTime={model.resetTime}
            cardSize={config.cardSize}
            overviewLayout={global.overviewLayout}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
            decimalPlaces={config.decimalPlaces}
            timeFormat={config.timeFormat}
            showResetTime={config.showResetTime}
            cardRadius={config.cardRadius}
            className={hasLowQuota(percentage) ? 'border-destructive' : ''}
            refreshKey={refreshKey}
          />
        )
      }).filter(Boolean)
    })
  }

  const renderGithubCopilotCards = () => {
    return ghUsage.flatMap((accountUsage) => {
      const account = visibleGhAccounts.find(a => a.id === accountUsage.accountId)
      if (!account) return []

      if (accountUsage.error && !accountUsage.usage) {
        const cardId = `githubCopilot-${accountUsage.accountId}-error`
        return [
          <ErrorCard
            key={cardId}
            title={t('nav.githubCopilot')}
            subtitle={account.displayName || accountUsage.name}
            errorMessage={accountUsage.error}
            cardSize={isCompactOverview ? 'compact' : undefined}
            className={compactFallbackClassName}
            onRetry={refreshAll}
          />
        ]
      }

      if (!accountUsage.usage) return []
      
      const snapshots = accountUsage.usage.quotaSnapshots || {}
      return Object.entries(snapshots).map(([key, quota]: [string, any]) => {
        const cardId = `githubCopilot-${accountUsage.accountId}-${key}`
        const isUnlimited = quota.unlimited
        if (isUnlimited && global.hideUnlimitedQuota) return null
        
        const percentage = quota.percent_remaining ?? 100
        if (!isCardVisible('githubCopilot', cardId)) return null
        if (!shouldShowCard(percentage, isUnlimited)) return null
        
        const config = getCardConfig('githubCopilot', cardId)
        return (
          <UsageCard
            key={cardId}
            title={getCopilotLabel(key)}
            subtitle={account.displayName || accountUsage.name}
            percentage={percentage}
            remaining={quota.remaining}
            total={quota.entitlement}
            resetTime={accountUsage.usage?.quotaResetDate}
            cardSize={config.cardSize}
            overviewLayout={global.overviewLayout}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
            decimalPlaces={config.decimalPlaces}
            timeFormat={config.timeFormat}
            showResetTime={config.showResetTime}
            cardRadius={config.cardRadius}
            className={hasLowQuota(percentage) ? 'border-destructive' : ''}
            refreshKey={refreshKey}
          />
        )
      }).filter(Boolean)
    })
  }

  const renderZaiCodingCards = () => {
    return zaiUsage.flatMap((accountUsage) => {
      const account = visibleZaiAccounts.find(a => a.id === accountUsage.accountId)
      if (!account) return []

      if (accountUsage.error && !accountUsage.usage) {
        const cardId = `zaiCoding-${accountUsage.accountId}-error`
        return [
          <ErrorCard
            key={cardId}
            title={t('nav.zaiCoding')}
            subtitle={account.displayName || accountUsage.name}
            errorMessage={accountUsage.error}
            cardSize={isCompactOverview ? 'compact' : undefined}
            className={compactFallbackClassName}
            onRetry={refreshAll}
          />
        ]
      }

      if (!accountUsage.usage) return []
      
      return accountUsage.usage.limits.map((limit, index) => {
        const cardId = `zaiCoding-${accountUsage.accountId}-${limit.type}-${limit.unit ?? index}-${limit.number ?? index}`
        const percentage = 100 - limit.percentage
        if (!isCardVisible('zaiCoding', cardId)) return null
        if (!shouldShowCard(percentage, false)) return null
        
        const config = getCardConfig('zaiCoding', cardId)
        return (
          <UsageCard
            key={cardId}
            title={getZaiLimitLabel(limit)}
            subtitle={account.displayName || accountUsage.name}
            percentage={percentage}
            remaining={limit.remaining}
            total={limit.usage}
            resetTime={limit.nextResetTime}
            cardSize={config.cardSize}
            overviewLayout={global.overviewLayout}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
            decimalPlaces={config.decimalPlaces}
            timeFormat={config.timeFormat}
            showResetTime={config.showResetTime}
            cardRadius={config.cardRadius}
            className={hasLowQuota(percentage) ? 'border-destructive' : ''}
            refreshKey={refreshKey}
          />
        )
      }).filter(Boolean)
    })
  }

  const renderCodexCards = () => {
    return codexUsage.flatMap((accountUsage) => {
      const account = visibleCodexAccounts.find(a => a.id === accountUsage.accountId)
      if (!account) return []

      if (accountUsage.error && !accountUsage.usage) {
        const cardId = `codex-${accountUsage.accountId}-error`
        return [
          <ErrorCard
            key={cardId}
            title={t('nav.codex')}
            subtitle={account.displayName || accountUsage.email}
            errorMessage={accountUsage.error}
            cardSize={isCompactOverview ? 'compact' : undefined}
            className={compactFallbackClassName}
            onRetry={refreshAll}
          />
        ]
      }

      if (!accountUsage.usage) return []

      const windowEntries: { kind: 'rateLimit' | 'codeReview'; cardIdSuffix: string; window: any }[] = [
        { kind: 'rateLimit', cardIdSuffix: 'rateLimit_primary', window: accountUsage.usage.rate_limit?.primary_window },
        { kind: 'rateLimit', cardIdSuffix: 'rateLimit_secondary', window: accountUsage.usage.rate_limit?.secondary_window },
        { kind: 'codeReview', cardIdSuffix: 'codeReview_primary', window: accountUsage.usage.code_review_rate_limit?.primary_window },
        { kind: 'codeReview', cardIdSuffix: 'codeReview_secondary', window: accountUsage.usage.code_review_rate_limit?.secondary_window }
      ]

      const cards = windowEntries.map((entry) => {
        if (!entry.window) return null
        const cardId = `codex-${accountUsage.accountId}-${entry.cardIdSuffix}`
        const percentage = 100 - Math.min(entry.window.used_percent, 100)
        if (!isCardVisible('codex', cardId)) return null
        if (!shouldShowCard(percentage, false)) return null

        const config = getCardConfig('codex', cardId)
        const resetTime = entry.window.reset_at ? entry.window.reset_at * 1000 : undefined
        return (
          <UsageCard
            key={cardId}
            title={getCodexWindowLabel(entry.window, entry.kind, t)}
            subtitle={account.displayName || accountUsage.email}
            percentage={percentage}
            resetTime={resetTime}
            cardSize={config.cardSize}
            overviewLayout={global.overviewLayout}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
            decimalPlaces={config.decimalPlaces}
            timeFormat={config.timeFormat}
            showResetTime={config.showResetTime}
            cardRadius={config.cardRadius}
            className={hasLowQuota(percentage) ? 'border-destructive' : ''}
            refreshKey={refreshKey}
          />
        )
      }).filter(Boolean)

      if (cards.length === 0) {
        return [
          <Card key={`codex-${accountUsage.accountId}-no-data`} className={compactFallbackClassName || 'rounded-md'}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{t('codex.noQuotaData')}</span>
              </div>
            </CardContent>
          </Card>
        ]
      }

      return cards
    })
  }

  const getOpencodeGoLimitLabel = (key: string) => {
    const mapping: Record<string, string> = {
      rollingUsage: t('opencodeGo.quotaTypes.rolling'),
      weeklyUsage: t('opencodeGo.quotaTypes.weekly'),
      monthlyUsage: t('opencodeGo.quotaTypes.monthly')
    }
    return mapping[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/Usage$/, '').trim()
  }

  const renderOpencodeGoCards = () => {
    return opencodeGoUsage.flatMap((accountUsage) => {
      const account = visibleOpencodeGoAccounts.find(a => a.id === accountUsage.accountId)
      if (!account) return []

      if (accountUsage.error && !accountUsage.usage) {
        const cardId = `opencodeGo-${accountUsage.accountId}-error`
        return [
          <ErrorCard
            key={cardId}
            title={t('nav.opencodeGo')}
            subtitle={account.displayName || accountUsage.name}
            errorMessage={accountUsage.error}
            cardSize={isCompactOverview ? 'compact' : undefined}
            className={compactFallbackClassName}
            onRetry={refreshAll}
          />
        ]
      }

      if (!accountUsage.usage) return []

      const cards = accountUsage.usage.limits.map((limit: any) => {
        const cardId = `opencodeGo-${accountUsage.accountId}-${limit.type}`
        const percentage = limit.unlimited ? 100 : limit.remaining
        if (!isCardVisible('opencodeGo', cardId)) return null
        if (!shouldShowCard(percentage, Boolean(limit.unlimited))) return null

        const config = getCardConfig('opencodeGo', cardId)
        return (
          <UsageCard
            key={cardId}
            title={getOpencodeGoLimitLabel(limit.type)}
            subtitle={account.displayName || accountUsage.name}
            percentage={percentage}
            remaining={limit.remaining}
            total={limit.limit}
            resetTime={limit.resetTime}
            cardSize={config.cardSize}
            overviewLayout={global.overviewLayout}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
            decimalPlaces={config.decimalPlaces}
            timeFormat={config.timeFormat}
            showResetTime={config.showResetTime}
            cardRadius={config.cardRadius}
            className={hasLowQuota(percentage) ? 'border-destructive' : ''}
            refreshKey={refreshKey}
          />
        )
      }).filter(Boolean)

      if (cards.length === 0) {
        return [
          <Card key={`opencodeGo-${accountUsage.accountId}-no-data`} className={compactFallbackClassName || 'rounded-md'}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{t('opencodeGo.noQuotaData')}</span>
              </div>
            </CardContent>
          </Card>
        ]
      }

      return cards
    })
  }

  const renderAiStudioCards = () => {
    return aiStudioUsage.flatMap((accountUsage) => {
      const account = visibleAiStudioAccounts.find(value => value.id === accountUsage.accountId)
      if (!account) return []

      if (accountUsage.error && !accountUsage.usage) {
        return [
          <ErrorCard
            key={`aiStudio-${accountUsage.accountId}-error`}
            title={t('nav.aiStudio')}
            subtitle={account.displayName}
            errorMessage={accountUsage.error}
            cardSize={isCompactOverview ? 'compact' : undefined}
            className={compactFallbackClassName}
            onRetry={refreshAll}
          />
        ]
      }

      if (!accountUsage.usage) return []
      if (accountUsage.usage.limits.length === 0) {
        return [
          <Card key={`aiStudio-${accountUsage.accountId}-no-data`} className={compactFallbackClassName || 'rounded-md'}>
            <CardContent className="pt-4 text-sm text-muted-foreground">{t('aiStudio.noQuotaData')}</CardContent>
          </Card>
        ]
      }

      return accountUsage.usage.limits.map((limit) => {
        const cardId = `aiStudio-${accountUsage.accountId}-${limit.model}`
        if (!isCardVisible('aiStudio', cardId)) return null
        const config = getCardConfig('aiStudio', cardId)
        return (
          <AiStudioLimitCard
            key={cardId}
            {...limit}
            subtitle={account.displayName}
            cardSize={config.cardSize}
            cardRadius={config.cardRadius}
            overviewLayout={global.overviewLayout}
            className={compactFallbackClassName}
          />
        )
      }).filter(Boolean)
    })
  }

  const providerData: Record<ProviderId, { title: string; hasAccounts: boolean; render: () => React.ReactNode[] }> = {
    antigravity: {
      title: t('nav.antigravity'),
      hasAccounts: visibleAntiAccounts.length > 0,
      render: renderAntigravityCards
    },
    githubCopilot: {
      title: t('nav.githubCopilot'),
      hasAccounts: visibleGhAccounts.length > 0,
      render: renderGithubCopilotCards
    },
    zaiCoding: {
      title: t('nav.zaiCoding'),
      hasAccounts: visibleZaiAccounts.length > 0,
      render: renderZaiCodingCards
    },
    codex: {
      title: t('nav.codex'),
      hasAccounts: visibleCodexAccounts.length > 0,
      render: renderCodexCards
    },
    opencodeGo: {
      title: t('nav.opencodeGo'),
      hasAccounts: visibleOpencodeGoAccounts.length > 0,
      render: renderOpencodeGoCards
    },
    aiStudio: {
      title: t('nav.aiStudio'),
      hasAccounts: visibleAiStudioAccounts.length > 0,
      render: renderAiStudioCards
    }
  }

  const sortedProviders = getSortedProviders()

  return (
    <div className={cn('fluent-page', isCompactOverview ? 'space-y-5' : 'space-y-7')}>
      <header className="fluent-page-header">
        <h1 className="fluent-page-title">{t('overview.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={refreshAll} disabled={isRefreshing} variant="outline">
            <RefreshCw className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => outletContext?.openAddProvider()}>
            <Plus aria-hidden="true" />
            {t('nav.addProvider')}
          </Button>
        </div>
      </header>

      <div className={isCompactOverview ? 'space-y-3' : 'space-y-7'}>
      {sortedProviders.map((providerId) => {
        const data = providerData[providerId]
        if (!data.hasAccounts) return null
        
        const isCollapsed = providers[providerId]?.collapsed ?? false
        const cards = data.render()
        if (cards.length === 0) return null
        const ProviderIcon = getProviderById(providerId)?.icon
        
        return (
          <CollapsibleSection
            key={providerId}
            title={data.title}
            icon={isCompactOverview && ProviderIcon ? (
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent text-primary">
                <ProviderIcon className="h-4 w-4" aria-hidden="true" />
              </span>
            ) : undefined}
            isCollapsed={isCollapsed}
            onToggle={() => toggleCollapse(providerId)}
            className={isCompactOverview
              ? 'overflow-hidden border bg-card shadow-fluent-2 [&>button]:mb-0 [&>button]:min-h-12 [&>button]:rounded-none [&>button]:px-3'
              : undefined}
          >
            <div className={isCompactOverview ? 'divide-y border-t' : getGridClass(providerId)}>
              {isCompactOverview && providerId === 'aiStudio' && (
                <div className="hidden grid-cols-[minmax(10rem,1.35fr)_repeat(3,minmax(5.5rem,1fr))] items-center gap-x-3 bg-secondary/50 px-4 py-1.5 text-[11px] font-semibold leading-4 text-muted-foreground lg:grid">
                  <span>{t('overview.columns.quota')}</span>
                  <span className="text-right">{t('aiStudio.rpm')}</span>
                  <span className="text-right">{t('aiStudio.tpm')}</span>
                  <span className="text-right">{t('aiStudio.rpd')}</span>
                </div>
              )}
              {isCompactOverview && providerId !== 'aiStudio' && (
                <div className="hidden grid-cols-[minmax(10rem,1.35fr)_minmax(8rem,1fr)_5.5rem_8rem] items-center gap-x-3 bg-secondary/50 px-4 py-1.5 text-[11px] font-semibold leading-4 text-muted-foreground lg:grid">
                  <span>{t('overview.columns.quota')}</span>
                  <span>{t('overview.columns.status')}</span>
                  <span className="text-right">{t('overview.columns.remaining')}</span>
                  <span className="text-right">{t('overview.columns.reset')}</span>
                </div>
              )}
              {cards}
            </div>
          </CollapsibleSection>
        )
      })}
      </div>

      {visibleAntiAccounts.length === 0 && 
       visibleGhAccounts.length === 0 && 
       visibleZaiAccounts.length === 0 && 
       visibleCodexAccounts.length === 0 &&
       visibleOpencodeGoAccounts.length === 0 &&
       visibleAiStudioAccounts.length === 0 && (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-secondary">
              <AlertTriangle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <h3 className="mb-1 text-base font-semibold leading-[22px]">{t('overview.noAccountsConfigured')}</h3>
            <p className="max-w-md text-sm leading-5 text-muted-foreground">
              {t('overview.addAccountsHint')}
            </p>
            <Button className="mt-5" onClick={() => outletContext?.openAddProvider()}>
              <Plus aria-hidden="true" />
              {t('nav.addProvider')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
