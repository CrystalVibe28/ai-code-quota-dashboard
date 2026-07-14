import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Trash2, Edit2, Eye, EyeOff, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UsageCard } from '@/components/common/UsageCard'
import { ErrorCard } from '@/components/common/ErrorCard'
import { EditNameDialog } from '@/components/common/EditNameDialog'
import { useAntigravityStore } from '@/stores/useAntigravityStore'
import { useGithubCopilotStore } from '@/stores/useGithubCopilotStore'
import { useZaiCodingStore } from '@/stores/useZaiCodingStore'
import { useCodexStore } from '@/stores/useCodexStore'
import { useOpencodeGoStore } from '@/stores/useOpencodeGoStore'
import { useCustomization } from '@/contexts/CustomizationContext'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { getQuotaGridClassName } from '@/constants/customization'
import { getProviderById } from '@/constants/providers'
import type { ProviderId } from '@/types/customization'
import type { ZaiLimit, ZaiUsage } from '@shared/types'
import { getAntigravityQuotaType } from '@shared/antigravityQuota'
import { getZaiQuotaType } from '@shared/zaiQuota'
import { getCodexWindowLabel } from '@/lib/codexQuota'
import { cn } from '@/lib/utils'

export function ProviderAccount() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { providerId, accountId } = useParams<{ providerId: string; accountId: string }>()
  
  const [showEditDialog, setShowEditDialog] = useState(false)
  
  // Stores
  const { 
    accounts: antiAccounts, 
    usageData: antiUsage, 
    isLoading: antiLoading,
    fetchAccounts: fetchAntiAccounts,
    fetchUsage: fetchAntiUsage,
    deleteAccount: deleteAntiAccount,
    updateAccount: updateAntiAccount
  } = useAntigravityStore()
  
  const { 
    accounts: ghAccounts, 
    usageData: ghUsage, 
    isLoading: ghLoading,
    fetchAccounts: fetchGhAccounts,
    fetchUsage: fetchGhUsage,
    deleteAccount: deleteGhAccount,
    updateAccount: updateGhAccount
  } = useGithubCopilotStore()
  
  const { 
    accounts: zaiAccounts, 
    usageData: zaiUsage, 
    isLoading: zaiLoading,
    fetchAccounts: fetchZaiAccounts,
    fetchUsage: fetchZaiUsage,
    deleteAccount: deleteZaiAccount,
    updateAccount: updateZaiAccount
  } = useZaiCodingStore()
  
  const { 
    accounts: codexAccounts, 
    usageData: codexUsage, 
    isLoading: codexLoading,
    fetchAccounts: fetchCodexAccounts,
    fetchUsage: fetchCodexUsage,
    deleteAccount: deleteCodexAccount,
    updateAccount: updateCodexAccount
  } = useCodexStore()

  const {
    accounts: opencodeGoAccounts,
    usageData: opencodeGoUsage,
    isLoading: opencodeGoLoading,
    fetchAccounts: fetchOpencodeGoAccounts,
    fetchUsage: fetchOpencodeGoUsage,
    deleteAccount: deleteOpencodeGoAccount,
    updateAccount: updateOpencodeGoAccount
  } = useOpencodeGoStore()
  
  const { global, getCardConfig, isCardVisible } = useCustomization()
  const { providers, updateCard } = useCustomizationStore()
  
  // Get provider info
  const provider = getProviderById(providerId as ProviderId)
  
  // Get account and usage data based on provider
  const { account, usage, isLoading } = useMemo(() => {
    if (providerId === 'antigravity') {
      const acc = antiAccounts.find(a => a.id === accountId)
      const usageItem = antiUsage.find(u => u.accountId === accountId)
      return { account: acc, usage: usageItem, isLoading: antiLoading }
    } else if (providerId === 'githubCopilot') {
      const acc = ghAccounts.find(a => a.id === accountId)
      const usageItem = ghUsage.find(u => u.accountId === accountId)
      return { account: acc, usage: usageItem, isLoading: ghLoading }
    } else if (providerId === 'zaiCoding') {
      const acc = zaiAccounts.find(a => a.id === accountId)
      const usageItem = zaiUsage.find(u => u.accountId === accountId)
      return { account: acc, usage: usageItem, isLoading: zaiLoading }
    } else if (providerId === 'codex') {
      const acc = codexAccounts.find(a => a.id === accountId)
      const usageItem = codexUsage.find(u => u.accountId === accountId)
      return { account: acc, usage: usageItem, isLoading: codexLoading }
    } else if (providerId === 'opencodeGo') {
      const acc = opencodeGoAccounts.find(a => a.id === accountId)
      const usageItem = opencodeGoUsage.find(u => u.accountId === accountId)
      return { account: acc, usage: usageItem, isLoading: opencodeGoLoading }
    }
    return { account: undefined, usage: undefined, isLoading: false }
  }, [providerId, accountId, antiAccounts, antiUsage, antiLoading, ghAccounts, ghUsage, ghLoading, zaiAccounts, zaiUsage, zaiLoading, codexAccounts, codexUsage, codexLoading, opencodeGoAccounts, opencodeGoUsage, opencodeGoLoading])
  
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

  const getOpencodeGoLimitLabel = (key: string) => {
    const mapping: Record<string, string> = {
      rollingUsage: t('opencodeGo.quotaTypes.rolling'),
      weeklyUsage: t('opencodeGo.quotaTypes.weekly'),
      monthlyUsage: t('opencodeGo.quotaTypes.monthly')
    }
    return mapping[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/Usage$/, '').trim()
  }
  
  if (!provider || !account) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('provider.accountNotFound')}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/overview')}
            >
              {t('common.backToOverview')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  const Icon = provider.icon
  const displayName = (account as any).displayName || (account as any).name || (account as any).email || (account as any).login || (account as any).workspaceName || (account as any).workspaceId || 'Unknown'
  const accountDetail = (account as any).email || (account as any).login || (account as any).workspaceName || (account as any).workspaceId
  const showInOverview = (account as any).showInOverview ?? true
  
  const handleRefresh = async () => {
    if (providerId === 'antigravity') {
      await fetchAntiAccounts()
      await fetchAntiUsage()
    } else if (providerId === 'githubCopilot') {
      await fetchGhAccounts()
      await fetchGhUsage()
    } else if (providerId === 'zaiCoding') {
      await fetchZaiAccounts()
      await fetchZaiUsage()
    } else if (providerId === 'codex') {
      await fetchCodexAccounts()
      await fetchCodexUsage()
    } else if (providerId === 'opencodeGo') {
      await fetchOpencodeGoAccounts()
      await fetchOpencodeGoUsage()
    }
  }
  
  const handleDelete = async () => {
    if (!confirm(t('provider.removeAccountConfirm'))) return
    
    let success = false
    if (providerId === 'antigravity') {
      success = await deleteAntiAccount(accountId!)
    } else if (providerId === 'githubCopilot') {
      success = await deleteGhAccount(accountId!)
    } else if (providerId === 'zaiCoding') {
      success = await deleteZaiAccount(accountId!)
    } else if (providerId === 'codex') {
      success = await deleteCodexAccount(accountId!)
    } else if (providerId === 'opencodeGo') {
      success = await deleteOpencodeGoAccount(accountId!)
    }
    
    if (success) {
      navigate('/overview')
    }
  }
  
  const handleToggleOverview = async () => {
    const newValue = !showInOverview
    if (providerId === 'antigravity') {
      await updateAntiAccount(accountId!, { showInOverview: newValue })
    } else if (providerId === 'githubCopilot') {
      await updateGhAccount(accountId!, { showInOverview: newValue })
    } else if (providerId === 'zaiCoding') {
      await updateZaiAccount(accountId!, { showInOverview: newValue })
    } else if (providerId === 'codex') {
      await updateCodexAccount(accountId!, { showInOverview: newValue })
    } else if (providerId === 'opencodeGo') {
      await updateOpencodeGoAccount(accountId!, { showInOverview: newValue })
    }
  }
  
  const handleSaveName = async (newName: string) => {
    let success = false
    if (providerId === 'antigravity') {
      success = await updateAntiAccount(accountId!, { displayName: newName })
    } else if (providerId === 'githubCopilot') {
      success = await updateGhAccount(accountId!, { displayName: newName })
    } else if (providerId === 'zaiCoding') {
      success = await updateZaiAccount(accountId!, { displayName: newName })
    } else if (providerId === 'codex') {
      success = await updateCodexAccount(accountId!, { displayName: newName })
    } else if (providerId === 'opencodeGo') {
      success = await updateOpencodeGoAccount(accountId!, { displayName: newName })
    }
    return success ? { success: true } : { success: false, error: t('editName.failedToSave') }
  }
  
  const getGridClass = () => {
    const cols = providers[providerId as ProviderId]?.gridColumns ?? global.gridColumns
    const cardSize = providers[providerId as ProviderId]?.cardSize ?? global.cardSize
    return getQuotaGridClassName(cols, cardSize)
  }
  
  // Render usage cards based on provider
  const renderUsageCards = () => {
    if (!usage?.usage) return null
    
    if (providerId === 'antigravity') {
      const usageData = usage.usage as any[]
      return usageData.map((model: any) => {
        const cardId = `antigravity-${accountId}-${model.modelName}`
        const config = getCardConfig('antigravity', cardId)
        return (
          <UsageCard
            key={cardId}
            title={getAntigravityQuotaLabel(model.modelName)}
            percentage={model.remainingFraction * 100}
            resetTime={model.resetTime}
            cardSize={config.cardSize}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
            decimalPlaces={config.decimalPlaces}
            timeFormat={config.timeFormat}
            showResetTime={config.showResetTime}
            cardRadius={config.cardRadius}
            showVisibilityToggle
            isVisibleInOverview={isCardVisible('antigravity', cardId)}
            onVisibilityToggle={(visible) => updateCard(cardId, { visible })}
          />
        )
      })
    }
    
    if (providerId === 'githubCopilot') {
      const usageData = usage.usage as any
      const snapshots = usageData.quotaSnapshots || {}
      return Object.entries(snapshots).map(([key, quota]: [string, any]) => {
        if (quota.unlimited && global.hideUnlimitedQuota) return null
        const cardId = `githubCopilot-${accountId}-${key}`
        const config = getCardConfig('githubCopilot', cardId)
        return (
          <UsageCard
            key={cardId}
            title={getCopilotLabel(key)}
            percentage={quota.percent_remaining}
            remaining={quota.remaining}
            total={quota.entitlement}
            resetTime={usageData.quotaResetDate}
            cardSize={config.cardSize}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
            decimalPlaces={config.decimalPlaces}
            timeFormat={config.timeFormat}
            showResetTime={config.showResetTime}
            cardRadius={config.cardRadius}
            showVisibilityToggle
            isVisibleInOverview={isCardVisible('githubCopilot', cardId)}
            onVisibilityToggle={(visible) => updateCard(cardId, { visible })}
          />
        )
      }).filter(Boolean)
    }
    
    if (providerId === 'zaiCoding') {
      const usageData = usage.usage as ZaiUsage
      return usageData.limits.map((limit, index) => {
        const cardId = `zaiCoding-${accountId}-${limit.type}-${limit.unit ?? index}-${limit.number ?? index}`
        const config = getCardConfig('zaiCoding', cardId)
        return (
          <UsageCard
            key={cardId}
            title={getZaiLimitLabel(limit)}
            percentage={100 - limit.percentage}
            remaining={limit.remaining}
            total={limit.usage}
            resetTime={limit.nextResetTime}
            cardSize={config.cardSize}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
            decimalPlaces={config.decimalPlaces}
            timeFormat={config.timeFormat}
            showResetTime={config.showResetTime}
            cardRadius={config.cardRadius}
            showVisibilityToggle
            isVisibleInOverview={isCardVisible('zaiCoding', cardId)}
            onVisibilityToggle={(visible) => updateCard(cardId, { visible })}
          />
        )
      })
    }

    if (providerId === 'codex') {
      const usageData = usage.usage as any
      const windowEntries: { kind: 'rateLimit' | 'codeReview'; cardIdSuffix: string; window: any }[] = [
        { kind: 'rateLimit', cardIdSuffix: 'rateLimit_primary', window: usageData.rate_limit?.primary_window },
        { kind: 'rateLimit', cardIdSuffix: 'rateLimit_secondary', window: usageData.rate_limit?.secondary_window },
        { kind: 'codeReview', cardIdSuffix: 'codeReview_primary', window: usageData.code_review_rate_limit?.primary_window },
        { kind: 'codeReview', cardIdSuffix: 'codeReview_secondary', window: usageData.code_review_rate_limit?.secondary_window }
      ]

      const cards = windowEntries.map((entry) => {
        if (!entry.window) return null
        const cardId = `codex-${accountId}-${entry.cardIdSuffix}`
        const percentage = 100 - Math.min(entry.window.used_percent, 100)
        const resetTime = entry.window.reset_at ? entry.window.reset_at * 1000 : undefined
        const config = getCardConfig('codex', cardId)
        return (
          <UsageCard
            key={cardId}
            title={getCodexWindowLabel(entry.window, entry.kind, t)}
            percentage={percentage}
            resetTime={resetTime}
            cardSize={config.cardSize}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
            decimalPlaces={config.decimalPlaces}
            timeFormat={config.timeFormat}
            showResetTime={config.showResetTime}
            cardRadius={config.cardRadius}
            showVisibilityToggle
            isVisibleInOverview={isCardVisible('codex', cardId)}
            onVisibilityToggle={(visible) => updateCard(cardId, { visible })}
          />
        )
      }).filter(Boolean)

      if (cards.length === 0) {
        return [
          <Card key={`codex-${accountId}-no-data`} className="rounded-md">
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
    }

    if (providerId === 'opencodeGo') {
      const usageData = usage.usage as any
      const cards = (usageData.limits || []).map((limit: any) => {
        const cardId = `opencodeGo-${accountId}-${limit.type}`
        const percentage = limit.unlimited ? 100 : limit.remaining
        const config = getCardConfig('opencodeGo', cardId)
        return (
          <UsageCard
            key={cardId}
            title={getOpencodeGoLimitLabel(limit.type)}
            percentage={percentage}
            remaining={limit.remaining}
            total={limit.limit}
            resetTime={limit.resetTime}
            cardSize={config.cardSize}
            progressStyle={config.progressStyle}
            valueFormat={config.valueFormat}
            decimalPlaces={config.decimalPlaces}
            timeFormat={config.timeFormat}
            showResetTime={config.showResetTime}
            cardRadius={config.cardRadius}
            showVisibilityToggle
            isVisibleInOverview={isCardVisible('opencodeGo', cardId)}
            onVisibilityToggle={(visible) => updateCard(cardId, { visible })}
          />
        )
      })

      if (cards.length === 0) {
        return [
          <Card key={`opencodeGo-${accountId}-no-data`} className="rounded-md">
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
    }
    
    return null
  }

  const renderErrorCard = () => {
    if (!usage?.error || usage?.usage) return null
    
    return (
      <ErrorCard
        title={provider?.name || ''}
        subtitle={displayName}
        errorMessage={usage.error}
        onRetry={handleRefresh}
      />
    )
  }

  return (
    <div className="fluent-page space-y-7">
      <header className="fluent-page-header">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="fluent-page-title truncate">{displayName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm leading-5 text-muted-foreground">
              <span>{provider.name}</span>
              {accountDetail && accountDetail !== displayName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{accountDetail}</span>
                </>
              )}
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs leading-4',
                  showInOverview ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                )}
              >
                {showInOverview ? <Eye className="h-3 w-3" aria-hidden="true" /> : <EyeOff className="h-3 w-3" aria-hidden="true" />}
                {showInOverview ? t('provider.visibleInOverview') : t('provider.hiddenFromOverview')}
              </span>
            </div>
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
          <RefreshCw className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
          {t('common.refresh')}
        </Button>
      </header>
      
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
          <div className="px-2 py-1 sm:mr-auto">
            <p className="text-sm font-semibold leading-5">{t('provider.accountSettings')}</p>
            <p className="text-xs leading-4 text-muted-foreground">{t('provider.accountSettingsDesc')}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowEditDialog(true)}
          >
            <Edit2 aria-hidden="true" />
            {t('provider.editName')}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleToggleOverview}
          >
            {showInOverview ? (
              <>
                <EyeOff aria-hidden="true" />
                {t('provider.hideFromOverview')}
              </>
            ) : (
              <>
                <Eye aria-hidden="true" />
                {t('provider.showInOverview')}
              </>
            )}
          </Button>
          
          <Button 
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 aria-hidden="true" />
            {t('provider.removeAccount')}
          </Button>
        </CardContent>
      </Card>
      
      {usage?.usage && (
        <section aria-labelledby="provider-usage-title">
          <h2 id="provider-usage-title" className="mb-3 text-xl font-semibold leading-[26px]">{t('provider.usage')}</h2>
          <div className={getGridClass()}>
            {renderUsageCards()}
          </div>
        </section>
      )}

      {usage?.error && !usage?.usage && (
        <section aria-labelledby="provider-usage-error-title">
          <h2 id="provider-usage-error-title" className="mb-3 text-xl font-semibold leading-[26px]">{t('provider.usage')}</h2>
          <div className={getGridClass()}>
            {renderErrorCard()}
          </div>
        </section>
      )}
      
      {/* Edit Name Dialog */}
      <EditNameDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        currentName={displayName}
        onSave={handleSaveName}
      />
    </div>
  )
}
