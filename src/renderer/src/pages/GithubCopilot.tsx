import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, RefreshCw, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountList } from '@/components/common/AccountList'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import { UsageCard } from '@/components/common/UsageCard'
import { AddAccountDialog } from '@/components/common/AddAccountDialog'
import { EditNameDialog } from '@/components/common/EditNameDialog'
import { useGithubCopilotStore } from '@/stores/useGithubCopilotStore'
import { useCustomization } from '@/contexts/CustomizationContext'
import { useCustomizationStore } from '@/stores/useCustomizationStore'

export function GithubCopilot() {
  const { t } = useTranslation()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string>('')
  const [error, setError] = useState('')

  const { global, isCardVisible } = useCustomization()
  const { providers, updateProvider, updateCard } = useCustomizationStore()

  const copilotLabelMap: Record<string, string> = {
    chat: 'Chat messages',
    completions: 'Code completions',
    premium_interactions: 'Premium requests'
  }

  const getCopilotLabel = (key: string) => copilotLabelMap[key] ?? key.replace(/_/g, ' ')
  
  const { 
    accounts, 
    usageData, 
    isLoading,
    fetchAccounts, 
    fetchUsage, 
    login, 
    deleteAccount,
    updateAccount 
  } = useGithubCopilotStore()

  const handleRefresh = async () => {
    await fetchAccounts()
    await fetchUsage()
  }

  const handleAddAccount = async (name: string, _apiKey: string) => {
    // The account is created during the login process in the dialog.
    // Here we just ensure the name is updated if provided.
    // The "login" function in store returns the result with account details if successful.
    
    await fetchAccounts()
    return { success: true }
  }

  const [pendingAccount, setPendingAccount] = useState<any>(null)
  
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
    const cols = providers.githubCopilot?.gridColumns ?? global.gridColumns
    if (cols === 'auto') return 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
    return `grid gap-4 grid-cols-${cols}`
  }

  const toggleAccountCollapse = (accountId: string) => {
    const current = providers.githubCopilot?.accountCollapsed ?? {}
    updateProvider('githubCopilot', {
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
            <Github className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('githubCopilot.title')}</h1>
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

            const snapshots = accountUsage.usage.quotaSnapshots || {}
            const cards = Object.entries(snapshots).map(([key, quota]: [string, any]) => {
              if (quota.unlimited) return null
              const cardId = `githubCopilot-${accountUsage.accountId}-${key}`
              return (
                <UsageCard
                  key={cardId}
                  title={getCopilotLabel(key)}
                  percentage={quota.percent_remaining}
                  remaining={quota.remaining}
                  total={quota.entitlement}
                  resetTime={accountUsage.usage?.quotaResetDate}
                  showVisibilityToggle
                  isVisibleInOverview={isCardVisible('githubCopilot', cardId)}
                  onVisibilityToggle={(visible) => updateCard(cardId, { visible })}
                />
              )
            }).filter(Boolean)

            if (cards.length === 0) return null

            const isCollapsed = providers.githubCopilot?.accountCollapsed?.[accountUsage.accountId] ?? false
            return (
              <CollapsibleSection
                key={accountUsage.accountId}
                title={accountUsage.name || accountUsage.login}
                isCollapsed={isCollapsed}
                onToggle={() => toggleAccountCollapse(accountUsage.accountId)}
              >
                <div className={getGridClass()}>
                  {cards}
                </div>
              </CollapsibleSection>
            )
          })}
        </section>
      )}

      <AddAccountDialog
        title={t('githubCopilot.addAccountTitle')}
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={handleDialogSubmit}
        mode="oauth"
        oauthProviderName="GitHub"
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
