import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UsageCard } from '@/components/common/UsageCard'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import { useAntigravityStore } from '@/stores/useAntigravityStore'
import { useGithubCopilotStore } from '@/stores/useGithubCopilotStore'
import { useZaiCodingStore } from '@/stores/useZaiCodingStore'
import { useCustomization } from '@/contexts/CustomizationContext'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import type { ProviderId } from '@/types/customization'

export function Overview() {
  const { t } = useTranslation()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const copilotLabelMap: Record<string, string> = {
    chat: 'Chat messages',
    completions: 'Code completions',
    premium_interactions: 'Premium requests'
  }

  const getCopilotLabel = (key: string) => copilotLabelMap[key] ?? key.replace(/_/g, ' ')

  const getZaiLimitLabel = (key: string) => {
    const normalizedKey = key.toLowerCase()
    const mapping: Record<string, string> = {
      tokens_limit: t('zaiCoding.limits.tokensLimit'),
      time_limit: t('zaiCoding.limits.timeLimit')
    }
    return mapping[normalizedKey] ?? key.replace(/_/g, ' ')
  }
  
  const { accounts: antiAccounts, usageData: antiUsage, fetchAccounts: fetchAntiAccounts, fetchUsage: fetchAntiUsage } = useAntigravityStore()
  const { accounts: ghAccounts, usageData: ghUsage, fetchAccounts: fetchGhAccounts, fetchUsage: fetchGhUsage } = useGithubCopilotStore()
  const { accounts: zaiAccounts, usageData: zaiUsage, fetchAccounts: fetchZaiAccounts, fetchUsage: fetchZaiUsage } = useZaiCodingStore()
  
  const { global, getSortedProviders, getCardConfig, isCardVisible } = useCustomization()
  const { providers, updateProvider } = useCustomizationStore()

const refreshAll = useCallback(async () => {
    setIsRefreshing(true)
    await Promise.all([fetchAntiAccounts(), fetchGhAccounts(), fetchZaiAccounts()])
    await Promise.all([fetchAntiUsage(), fetchGhUsage(), fetchZaiUsage()])
    setRefreshKey(prev => prev + 1)
    setIsRefreshing(false)
    // Trigger notification check after refreshing data
    window.api.notification.triggerCheck().catch(() => {})
  }, [fetchAntiAccounts, fetchGhAccounts, fetchZaiAccounts, fetchAntiUsage, fetchGhUsage, fetchZaiUsage])

  const visibleAntiAccounts = antiAccounts.filter(a => a.showInOverview)
  const visibleGhAccounts = ghAccounts.filter(a => a.showInOverview)
  const visibleZaiAccounts = zaiAccounts.filter(a => a.showInOverview)

  const hasLowQuota = (percentage: number) => percentage <= global.lowQuotaThreshold
  
  const shouldShowCard = (percentage: number, isUnlimited: boolean) => {
    if (global.hideUnlimitedQuota && isUnlimited) return false
    return true
  }

  const getGridClass = (providerId: ProviderId) => {
    const cols = providers[providerId]?.gridColumns ?? global.gridColumns
    if (cols === 'auto') return 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
    return `grid gap-4 grid-cols-${cols}`
  }

  const toggleCollapse = (providerId: ProviderId) => {
    updateProvider(providerId, { collapsed: !providers[providerId]?.collapsed })
  }

  const renderAntigravityCards = () => {
    return antiUsage.flatMap((accountUsage) => {
      const account = visibleAntiAccounts.find(a => a.id === accountUsage.accountId)
      if (!account || !accountUsage.usage) return []
      
      return accountUsage.usage.map((model: any) => {
        const cardId = `antigravity-${accountUsage.accountId}-${model.modelName}`
        const percentage = model.remainingFraction * 100
        if (!isCardVisible('antigravity', cardId)) return null
        if (!shouldShowCard(percentage, false)) return null
        
        const config = getCardConfig('antigravity', cardId)
        return (
          <UsageCard
            key={cardId}
            title={model.modelName}
            subtitle={account.displayName || accountUsage.name}
            percentage={percentage}
            resetTime={model.resetTime}
            cardSize={config.cardSize}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
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
      if (!account || !accountUsage.usage) return []
      
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
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
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
      if (!account || !accountUsage.usage) return []
      
      return accountUsage.usage.limits.map((limit: any) => {
        const cardId = `zaiCoding-${accountUsage.accountId}-${limit.type}`
        const percentage = 100 - limit.percentage
        if (!isCardVisible('zaiCoding', cardId)) return null
        if (!shouldShowCard(percentage, false)) return null
        
        const config = getCardConfig('zaiCoding', cardId)
        return (
          <UsageCard
            key={cardId}
            title={getZaiLimitLabel(limit.type)}
            subtitle={account.displayName || accountUsage.name}
            percentage={percentage}
            remaining={limit.remaining}
            total={limit.usage}
            resetTime={limit.nextResetTime}
            cardSize={config.cardSize}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
            showResetTime={config.showResetTime}
            cardRadius={config.cardRadius}
            className={hasLowQuota(percentage) ? 'border-destructive' : ''}
            refreshKey={refreshKey}
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
    }
  }

  const sortedProviders = getSortedProviders()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('overview.title')}</h1>
        </div>
        <Button onClick={refreshAll} disabled={isRefreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {sortedProviders.map((providerId) => {
        const data = providerData[providerId]
        if (!data.hasAccounts) return null
        
        const isCollapsed = providers[providerId]?.collapsed ?? false
        const cards = data.render()
        if (cards.length === 0) return null
        
        return (
          <CollapsibleSection
            key={providerId}
            title={data.title}
            isCollapsed={isCollapsed}
            onToggle={() => toggleCollapse(providerId)}
          >
            <div className={getGridClass(providerId)}>
              {cards}
            </div>
          </CollapsibleSection>
        )
      })}

      {visibleAntiAccounts.length === 0 && 
       visibleGhAccounts.length === 0 && 
       visibleZaiAccounts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('overview.noAccountsConfigured')}</h3>
            <p className="text-muted-foreground">
              {t('overview.addAccountsHint')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
