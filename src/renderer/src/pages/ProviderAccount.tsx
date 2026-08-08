import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Trash2, Edit2, Eye, EyeOff, Info, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UsageCard } from '@/components/common/UsageCard'
import { AiStudioLimitCard } from '@/components/common/AiStudioLimitCard'
import { AiStudioTierBadge } from '@/components/common/AiStudioTierBadge'
import { AiStudioTierDialog } from '@/components/common/AiStudioTierDialog'
import { ErrorCard } from '@/components/common/ErrorCard'
import { EditNameDialog } from '@/components/common/EditNameDialog'
import { QuotaHistoryChart } from '@/components/common/QuotaHistoryChart'
import { useAntigravityStore } from '@/stores/useAntigravityStore'
import { useGithubCopilotStore } from '@/stores/useGithubCopilotStore'
import { useZaiCodingStore } from '@/stores/useZaiCodingStore'
import { useCodexStore } from '@/stores/useCodexStore'
import { useOpencodeGoStore } from '@/stores/useOpencodeGoStore'
import { useOllamaCloudStore } from '@/stores/useOllamaCloudStore'
import { useAiStudioStore } from '@/stores/useAiStudioStore'
import { useCustomization } from '@/contexts/CustomizationContext'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { getQuotaGridClassName } from '@/constants/customization'
import { getProviderById } from '@/constants/providers'
import type { ProviderId } from '@/types/customization'
import type {
  AiStudioAccount,
  AiStudioPaidTier,
  AiStudioUsage,
  QuotaHistory,
  QuotaHistoryPeriod,
  ZaiLimit,
  ZaiUsage
} from '@shared/types'
import { getAntigravityQuotaType } from '@shared/antigravityQuota'
import { getZaiCardId, getZaiQuotaType } from '@shared/zaiQuota'
import { getCodexWindowLabel } from '@/lib/codexQuota'
import { getAccountCardIds } from '@/lib/cardVisibility'
import { isGoogleOAuthReauthorizationRequired } from '@/lib/googleApiError'

const HISTORY_PERIODS: Partial<Record<ProviderId, QuotaHistoryPeriod[]>> = {
  antigravity: ['weekly'],
  zaiCoding: ['weekly'],
  codex: ['weekly', 'monthly'],
  opencodeGo: ['weekly', 'monthly'],
  ollamaCloud: ['weekly']
}

export function ProviderAccount() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { providerId, accountId } = useParams<{ providerId: string; accountId: string }>()
  
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showTierDialog, setShowTierDialog] = useState(false)
  const [history, setHistory] = useState<QuotaHistory>({ weekly: [], monthly: [] })
  
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

  const {
    accounts: ollamaCloudAccounts,
    usageData: ollamaCloudUsage,
    isLoading: ollamaCloudLoading,
    fetchAccounts: fetchOllamaCloudAccounts,
    fetchUsage: fetchOllamaCloudUsage,
    deleteAccount: deleteOllamaCloudAccount,
    updateAccount: updateOllamaCloudAccount
  } = useOllamaCloudStore()

  const {
    accounts: aiStudioAccounts,
    usageData: aiStudioUsage,
    isLoading: aiStudioLoading,
    fetchAccounts: fetchAiStudioAccounts,
    fetchUsage: fetchAiStudioUsage,
    deleteAccount: deleteAiStudioAccount,
    updateAccount: updateAiStudioAccount,
    reauthorizeAccount: reauthorizeAiStudioAccount
  } = useAiStudioStore()
  
  const { global, getCardConfig, isCardVisible } = useCustomization()
  const {
    isLoaded,
    providers,
    syncAccountCards,
    setAccountCardsVisibility,
    setCardVisibility
  } = useCustomizationStore()
  
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
    } else if (providerId === 'ollamaCloud') {
      const acc = ollamaCloudAccounts.find(a => a.id === accountId)
      const usageItem = ollamaCloudUsage.find(u => u.accountId === accountId)
      return { account: acc, usage: usageItem, isLoading: ollamaCloudLoading }
    } else if (providerId === 'aiStudio') {
      const acc = aiStudioAccounts.find(a => a.id === accountId)
      const usageItem = aiStudioUsage.find(u => u.accountId === accountId)
      return { account: acc, usage: usageItem, isLoading: aiStudioLoading }
    }
    return { account: undefined, usage: undefined, isLoading: false }
  }, [providerId, accountId, antiAccounts, antiUsage, antiLoading, ghAccounts, ghUsage, ghLoading, zaiAccounts, zaiUsage, zaiLoading, codexAccounts, codexUsage, codexLoading, opencodeGoAccounts, opencodeGoUsage, opencodeGoLoading, ollamaCloudAccounts, ollamaCloudUsage, ollamaCloudLoading, aiStudioAccounts, aiStudioUsage, aiStudioLoading])

  const aiStudioAccount = providerId === 'aiStudio' ? account as AiStudioAccount | undefined : undefined
  const currentAiStudioUsage = providerId === 'aiStudio' && usage?.usage ? usage.usage as AiStudioUsage : null
  const aiStudioTier = currentAiStudioUsage?.tier ?? aiStudioAccount?.tier
  const aiStudioTierSource = currentAiStudioUsage?.tierSource ?? aiStudioAccount?.tierSource

  useEffect(() => {
    if (aiStudioTier === 'free') setShowTierDialog(false)
  }, [aiStudioTier])

  useEffect(() => {
    const periods = HISTORY_PERIODS[providerId as ProviderId]
    if (!providerId || !accountId || !periods) {
      setHistory({ weekly: [], monthly: [] })
      return
    }

    let cancelled = false
    void window.api.storage
      .getQuotaHistory(providerId as ProviderId, accountId)
      .then(value => {
        if (!cancelled) setHistory(value)
      })
      .catch(() => {
        if (!cancelled) setHistory({ weekly: [], monthly: [] })
      })
    return () => {
      cancelled = true
    }
  }, [providerId, accountId, usage])

  const fallbackCardVisibility = (account as any)?.showInOverview ?? true
  const currentCardIds = useMemo(() => {
    if (!providerId || !accountId) return []
    return getAccountCardIds(providerId as ProviderId, accountId, usage?.usage, global.hideUnlimitedQuota)
  }, [providerId, accountId, usage?.usage, global.hideUnlimitedQuota])
  const historyPeriods = (HISTORY_PERIODS[providerId as ProviderId] ?? [])
    .filter(period => providerId !== 'codex' || history[period].length > 0)

  useEffect(() => {
    if (!isLoaded || !provider || !providerId || !accountId) return
    syncAccountCards([{
      providerId: providerId as ProviderId,
      accountId,
      cardIds: currentCardIds,
      fallbackVisible: fallbackCardVisibility
    }])
  }, [isLoaded, provider, providerId, accountId, currentCardIds, fallbackCardVisibility, syncAccountCards])
  
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

  const getPercentLimitLabel = (percentProviderId: 'opencodeGo' | 'ollamaCloud', key: string) => {
    const mapping: Record<string, string> = percentProviderId === 'opencodeGo'
      ? {
          rollingUsage: t('opencodeGo.quotaTypes.rolling'),
          weeklyUsage: t('opencodeGo.quotaTypes.weekly'),
          monthlyUsage: t('opencodeGo.quotaTypes.monthly')
        }
      : {
          session: t('ollamaCloud.quotaTypes.session'),
          weekly: t('ollamaCloud.quotaTypes.weekly')
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
  const accountDetail = providerId === 'aiStudio'
    ? `${(account as any).projectName} (${(account as any).projectId})`
    : (account as any).email || (account as any).login || (account as any).workspaceName || (account as any).workspaceId
  const currentProviderId = providerId as ProviderId
  const hasVisibleCards = currentCardIds.length > 0
    ? currentCardIds.some(cardId => isCardVisible(currentProviderId, cardId, accountId, fallbackCardVisibility))
    : providers[currentProviderId]?.accountCardVisibility?.[accountId!] ?? fallbackCardVisibility
  
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
    } else if (providerId === 'ollamaCloud') {
      await fetchOllamaCloudAccounts()
      await fetchOllamaCloudUsage()
    } else if (providerId === 'aiStudio') {
      await fetchAiStudioUsage()
      await fetchAiStudioAccounts()
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
    } else if (providerId === 'ollamaCloud') {
      success = await deleteOllamaCloudAccount(accountId!)
    } else if (providerId === 'aiStudio') {
      success = await deleteAiStudioAccount(accountId!)
    }
    
    if (success) {
      navigate('/overview')
    }
  }
  
  const handleToggleAllCards = () => {
    setAccountCardsVisibility(currentProviderId, accountId!, currentCardIds, !hasVisibleCards)
  }

  const handleCardVisibilityToggle = (cardId: string, visible: boolean) => {
    setCardVisibility(
      currentProviderId,
      accountId!,
      currentCardIds,
      cardId,
      visible,
      fallbackCardVisibility
    )
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
    } else if (providerId === 'ollamaCloud') {
      success = await updateOllamaCloudAccount(accountId!, { displayName: newName })
    } else if (providerId === 'aiStudio') {
      success = await updateAiStudioAccount(accountId!, { displayName: newName })
    }
    return success ? { success: true } : { success: false, error: t('editName.failedToSave') }
  }

  const handleSaveTier = async (tier: AiStudioPaidTier) => {
    const success = await updateAiStudioAccount(accountId!, {
      tier,
      manualTier: tier,
      tierSource: 'manual'
    })
    if (!success) return false

    await fetchAiStudioUsage()
    await fetchAiStudioAccounts()
    return true
  }
  
  const getGridClass = () => {
    if (providerId === 'aiStudio') return 'grid grid-cols-1 gap-4 lg:grid-cols-2'
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
        const config = getCardConfig('antigravity', cardId, accountId, fallbackCardVisibility)
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
            isVisibleInOverview={isCardVisible('antigravity', cardId, accountId, fallbackCardVisibility)}
            onVisibilityToggle={(visible) => handleCardVisibilityToggle(cardId, visible)}
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
        const config = getCardConfig('githubCopilot', cardId, accountId, fallbackCardVisibility)
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
            isVisibleInOverview={isCardVisible('githubCopilot', cardId, accountId, fallbackCardVisibility)}
            onVisibilityToggle={(visible) => handleCardVisibilityToggle(cardId, visible)}
          />
        )
      }).filter(Boolean)
    }
    
    if (providerId === 'zaiCoding') {
      const usageData = usage.usage as ZaiUsage
      return usageData.limits.map((limit) => {
        const cardId = getZaiCardId(accountId!, limit)
        const config = getCardConfig('zaiCoding', cardId, accountId, fallbackCardVisibility)
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
            isVisibleInOverview={isCardVisible('zaiCoding', cardId, accountId, fallbackCardVisibility)}
            onVisibilityToggle={(visible) => handleCardVisibilityToggle(cardId, visible)}
          />
        )
      })
    }

    if (providerId === 'aiStudio') {
      const usageData = usage.usage as AiStudioUsage
      if (usageData.limits.length === 0) {
        return [
          <Card key={`aiStudio-${accountId}-no-data`} className="rounded-md">
            <CardContent className="pt-4 text-sm text-muted-foreground">{t('aiStudio.noQuotaData')}</CardContent>
          </Card>
        ]
      }

      return usageData.limits.map((limit) => {
        const cardId = `aiStudio-${accountId}-${limit.model}`
        const config = getCardConfig('aiStudio', cardId, accountId, fallbackCardVisibility)
        return (
          <AiStudioLimitCard
            key={cardId}
            {...limit}
            cardSize={config.cardSize}
            cardRadius={config.cardRadius}
            showVisibilityToggle
            isVisibleInOverview={isCardVisible('aiStudio', cardId, accountId, fallbackCardVisibility)}
            onVisibilityToggle={(visible) => handleCardVisibilityToggle(cardId, visible)}
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
        const config = getCardConfig('codex', cardId, accountId, fallbackCardVisibility)
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
            isVisibleInOverview={isCardVisible('codex', cardId, accountId, fallbackCardVisibility)}
            onVisibilityToggle={(visible) => handleCardVisibilityToggle(cardId, visible)}
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

    if (providerId === 'opencodeGo' || providerId === 'ollamaCloud') {
      const usageData = usage.usage as any
      const cards = (usageData.limits || []).map((limit: any) => {
        const cardId = `${providerId}-${accountId}-${limit.type}`
        const percentage = limit.unlimited ? 100 : limit.remaining
        const config = getCardConfig(providerId, cardId, accountId, fallbackCardVisibility)
        return (
          <UsageCard
            key={cardId}
            title={getPercentLimitLabel(providerId, limit.type)}
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
            isVisibleInOverview={isCardVisible(providerId, cardId, accountId, fallbackCardVisibility)}
            onVisibilityToggle={(visible) => handleCardVisibilityToggle(cardId, visible)}
          />
        )
      })

      if (cards.length === 0) {
        return [
          <Card key={`${providerId}-${accountId}-no-data`} className="rounded-md">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{t(`${providerId}.noQuotaData`)}</span>
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

    const requiresReauthorization = providerId === 'aiStudio' &&
      isGoogleOAuthReauthorizationRequired(usage.error)
    return (
      <ErrorCard
        title={provider?.name || ''}
        subtitle={displayName}
        errorMessage={requiresReauthorization
          ? t('aiStudio.reauthorization.expired')
          : usage.error}
        actionLabel={requiresReauthorization ? t('aiStudio.reauthorization.action') : undefined}
        isActionPending={requiresReauthorization && aiStudioLoading}
        onAction={requiresReauthorization
          ? () => void reauthorizeAiStudioAccount(accountId!)
          : undefined}
        onRetry={requiresReauthorization ? undefined : handleRefresh}
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
              {aiStudioTier && (
                <>
                  <span aria-hidden="true">·</span>
                  <AiStudioTierBadge tier={aiStudioTier} source={aiStudioTierSource} />
                </>
              )}
            </div>
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
          <RefreshCw className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
          {t('common.refresh')}
        </Button>
      </header>
      
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
          <h2 className="px-1 text-sm font-semibold leading-5 sm:mr-auto">{t('provider.accountSettings')}</h2>
          {aiStudioTier && aiStudioTier !== 'free' && (
            <Button variant="outline" onClick={() => setShowTierDialog(true)}>
              <Settings2 aria-hidden="true" />
              {t('aiStudio.tierSettings.action')}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setShowEditDialog(true)}
          >
            <Edit2 aria-hidden="true" />
            {t('provider.editName')}
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleToggleAllCards}
          >
            {hasVisibleCards ? (
              <>
                <EyeOff aria-hidden="true" />
                {t('provider.hideAll')}
              </>
            ) : (
              <>
                <Eye aria-hidden="true" />
                {t('provider.showAll')}
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

      {historyPeriods.length > 0 && (
        <section aria-labelledby="provider-history-title">
          <h2 id="provider-history-title" className="mb-3 text-xl font-semibold leading-[26px]">
            {t('history.title')}
          </h2>
          <div className={`grid gap-4 ${historyPeriods.length > 1 ? 'xl:grid-cols-2' : ''}`}>
            {historyPeriods.map(period => (
              <QuotaHistoryChart
                key={period}
                providerId={providerId as ProviderId}
                period={period}
                points={history[period]}
              />
            ))}
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
      {aiStudioTier && aiStudioTier !== 'free' && (
        <AiStudioTierDialog
          isOpen={showTierDialog}
          currentTier={aiStudioTier}
          onClose={() => setShowTierDialog(false)}
          onSave={handleSaveTier}
        />
      )}
    </div>
  )
}
