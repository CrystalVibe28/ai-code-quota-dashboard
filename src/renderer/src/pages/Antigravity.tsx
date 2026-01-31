import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountList } from '@/components/common/AccountList'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import { UsageCard } from '@/components/common/UsageCard'
import { AddAccountDialog } from '@/components/common/AddAccountDialog'
import { EditNameDialog } from '@/components/common/EditNameDialog'
import { useAntigravityStore } from '@/stores/useAntigravityStore'
import { useCustomization } from '@/contexts/CustomizationContext'
import { useCustomizationStore } from '@/stores/useCustomizationStore'

export function Antigravity() {
  const { t } = useTranslation()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string>('')
  const [error, setError] = useState('')
  const [pendingAccount, setPendingAccount] = useState<any>(null)

  const { global, isCardVisible } = useCustomization()
  const { providers, updateProvider, updateCard } = useCustomizationStore()
  
  const { 
    accounts, 
    usageData, 
    isLoading,
    fetchAccounts,
    fetchUsage, 
    login, 
    deleteAccount,
    updateAccount 
  } = useAntigravityStore()

  const handleRefresh = async () => {
    await fetchAccounts()
    await fetchUsage()
  }

  const handleDialogLogin = async () => {
    const result = await login()
    if (result.success && result.account) {
      setPendingAccount(result.account)
    }
    return result
  }

  const handleDialogSubmit = async (name: string, _apiKey: string) => {
    if (pendingAccount && pendingAccount.id && name) {
      await updateAccount(pendingAccount.id, { name })
    }
    await handleRefresh()
    setPendingAccount(null)
    return { success: true }
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
    const cols = providers.antigravity?.gridColumns ?? global.gridColumns
    if (cols === 'auto') return 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
    return `grid gap-4 grid-cols-${cols}`
  }

  const toggleAccountCollapse = (accountId: string) => {
    const current = providers.antigravity?.accountCollapsed ?? {}
    updateProvider('antigravity', {
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
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('antigravity.title')}</h1>
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

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

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
            const isCollapsed = providers.antigravity?.accountCollapsed?.[accountUsage.accountId] ?? false

            return (
              <CollapsibleSection
                key={accountUsage.accountId}
                title={accountUsage.email}
                isCollapsed={isCollapsed}
                onToggle={() => toggleAccountCollapse(accountUsage.accountId)}
              >
                <div className={getGridClass()}>
                  {accountUsage.usage.map((model: any) => {
                    const cardId = `antigravity-${accountUsage.accountId}-${model.modelName}`
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
                  })}
                </div>
              </CollapsibleSection>
            )
          })}
        </section>
      )}

      <AddAccountDialog
        title={t('antigravity.title')}
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={handleDialogSubmit}
        mode="oauth"
        oauthProviderName="Google"
        onLogin={handleDialogLogin}
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
