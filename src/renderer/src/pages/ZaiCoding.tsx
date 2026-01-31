import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, RefreshCw, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountList } from '@/components/common/AccountList'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import { AddAccountDialog } from '@/components/common/AddAccountDialog'
import { EditNameDialog } from '@/components/common/EditNameDialog'
import { UsageCard } from '@/components/common/UsageCard'
import { useZaiCodingStore } from '@/stores/useZaiCodingStore'
import { useCustomization } from '@/contexts/CustomizationContext'
import { useCustomizationStore } from '@/stores/useCustomizationStore'

export function ZaiCoding() {
  const { t } = useTranslation()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string>('')

  const { global, isCardVisible } = useCustomization()
  const { providers, updateProvider, updateCard } = useCustomizationStore()

  const getZaiLimitLabel = (key: string) => {
    const normalizedKey = key.toLowerCase()
    const mapping: Record<string, string> = {
      tokens_limit: t('zaiCoding.limits.tokensLimit'),
      time_limit: t('zaiCoding.limits.timeLimit')
    }
    return mapping[normalizedKey] ?? key.replace(/_/g, ' ')
  }
  
  const { 
    accounts, 
    usageData, 
    isLoading,
    fetchAccounts, 
    fetchUsage, 
    addAccount, 
    deleteAccount,
    updateAccount 
  } = useZaiCodingStore()

  const handleRefresh = async () => {
    await fetchAccounts()
    await fetchUsage()
  }

  const handleAddAccount = async (name: string, apiKey: string) => {
    const result = await addAccount(name, apiKey)
    if (result.success) {
      await fetchUsage()
    }
    return result
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('provider.removeAccountConfirm'))) {
      await deleteAccount(id)
    }
  }

  const handleToggleOverview = async (id: string, show: boolean) => {
    await updateAccount(id, { showInOverview: show })
  }

  const handleEditName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    if (account) {
      setEditingAccountId(accountId)
      setShowEditDialog(true)
    }
  }

  const handleSaveName = async (newName: string) => {
    const result = await updateAccount(editingAccountId, { name: newName })
    return result ? { success: true } : { success: false, error: t('editName.failedToSave') }
  }

  const getGridClass = () => {
    const cols = providers.zaiCoding?.gridColumns ?? global.gridColumns
    if (cols === 'auto') return 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
    return `grid gap-4 grid-cols-${cols}`
  }

  const toggleAccountCollapse = (accountId: string) => {
    const current = providers.zaiCoding?.accountCollapsed ?? {}
    updateProvider('zaiCoding', {
      accountCollapsed: {
        ...current,
        [accountId]: !current[accountId]
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('zaiCoding.title')}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('provider.addAccount')}
          </Button>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">{t('provider.accounts')}</h2>
        <AccountList
          accounts={accounts}
          onDelete={handleDelete}
          onToggleOverview={handleToggleOverview}
          onEditName={handleEditName}
        />
      </section>

      {usageData.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold mb-3">{t('provider.usage')}</h2>
          {usageData.map((accountUsage) => {
            if (!accountUsage.usage) return null
            const isCollapsed = providers.zaiCoding?.accountCollapsed?.[accountUsage.accountId] ?? false

            return (
              <CollapsibleSection
                key={accountUsage.accountId}
                title={accountUsage.name}
                isCollapsed={isCollapsed}
                onToggle={() => toggleAccountCollapse(accountUsage.accountId)}
              >
                <div className={getGridClass()}>
                  {accountUsage.usage.limits.map((limit: any) => {
                    const cardId = `zaiCoding-${accountUsage.accountId}-${limit.type}`
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
                  })}
                </div>
              </CollapsibleSection>
            )
          })}
        </section>
      )}

      <AddAccountDialog
        title={t('zaiCoding.addAccountTitle')}
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={handleAddAccount}
        apiKeyPlaceholder={t('zaiCoding.apiKeyPlaceholder')}
      />

      <EditNameDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        currentName={accounts.find(a => a.id === editingAccountId)?.name || ''}
        onSave={handleSaveName}
      />
    </div>
  )
}
