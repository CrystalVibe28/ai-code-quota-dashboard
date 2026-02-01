import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Trash2, Edit2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageCard } from '@/components/common/UsageCard'
import { EditNameDialog } from '@/components/common/EditNameDialog'
import { useAntigravityStore } from '@/stores/useAntigravityStore'
import { useGithubCopilotStore } from '@/stores/useGithubCopilotStore'
import { useZaiCodingStore } from '@/stores/useZaiCodingStore'
import { useCustomization } from '@/contexts/CustomizationContext'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { getProviderById } from '@/constants/providers'
import type { ProviderId } from '@/types/customization'

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
  
  const { global, isCardVisible } = useCustomization()
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
    }
    return { account: undefined, usage: undefined, isLoading: false }
  }, [providerId, accountId, antiAccounts, antiUsage, antiLoading, ghAccounts, ghUsage, ghLoading, zaiAccounts, zaiUsage, zaiLoading])
  
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
  const displayName = (account as any).displayName || (account as any).name || (account as any).email || (account as any).login || 'Unknown'
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
    }
    return success ? { success: true } : { success: false, error: t('editName.failedToSave') }
  }
  
  const getGridClass = () => {
    const cols = providers[providerId as ProviderId]?.gridColumns ?? global.gridColumns
    if (cols === 'auto') return 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
    return `grid gap-4 grid-cols-${cols}`
  }
  
  // Render usage cards based on provider
  const renderUsageCards = () => {
    if (!usage?.usage) return null
    
    if (providerId === 'antigravity') {
      const usageData = usage.usage as any[]
      return usageData.map((model: any) => {
        const cardId = `antigravity-${accountId}-${model.modelName}`
        return (
          <UsageCard
            key={cardId}
            title={model.modelName}
            percentage={model.remainingFraction * 100}
            resetTime={model.resetTime}
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
        return (
          <UsageCard
            key={cardId}
            title={getCopilotLabel(key)}
            percentage={quota.percent_remaining}
            remaining={quota.remaining}
            total={quota.entitlement}
            resetTime={usageData.quotaResetDate}
            showVisibilityToggle
            isVisibleInOverview={isCardVisible('githubCopilot', cardId)}
            onVisibilityToggle={(visible) => updateCard(cardId, { visible })}
          />
        )
      }).filter(Boolean)
    }
    
    if (providerId === 'zaiCoding') {
      const usageData = usage.usage as any
      return usageData.limits.map((limit: any) => {
        const cardId = `zaiCoding-${accountId}-${limit.type}`
        return (
          <UsageCard
            key={cardId}
            title={getZaiLimitLabel(limit.type)}
            percentage={100 - limit.percentage}
            remaining={limit.remaining}
            total={limit.usage}
            resetTime={limit.nextResetTime}
            showVisibilityToggle
            isVisibleInOverview={isCardVisible('zaiCoding', cardId)}
            onVisibilityToggle={(visible) => updateCard(cardId, { visible })}
          />
        )
      })
    }
    
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{provider.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>
      
      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('provider.accountSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            {t('provider.editName')}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleToggleOverview}
          >
            {showInOverview ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                {t('provider.hideFromOverview')}
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                {t('provider.showInOverview')}
              </>
            )}
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('provider.removeAccount')}
          </Button>
        </CardContent>
      </Card>
      
      {/* Usage Cards */}
      {usage?.usage && (
        <section>
          <h2 className="text-lg font-semibold mb-3">{t('provider.usage')}</h2>
          <div className={getGridClass()}>
            {renderUsageCards()}
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
