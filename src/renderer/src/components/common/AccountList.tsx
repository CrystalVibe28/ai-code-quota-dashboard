import { useTranslation } from 'react-i18next'
import { Trash2, Eye, EyeOff, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Account {
  id: string
  name?: string
  email?: string
  showInOverview: boolean
}

interface AccountListProps {
  accounts: Account[]
  onDelete: (id: string) => void
  onToggleOverview: (id: string, show: boolean) => void
  onEditName?: (id: string) => void
  renderExtra?: (account: Account) => React.ReactNode
}

export function AccountList({ accounts, onDelete, onToggleOverview, onEditName, renderExtra }: AccountListProps) {
  const { t } = useTranslation()

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('provider.noAccountsConfigured')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {accounts.map((account) => (
        <Card key={account.id} className="hover:bg-accent/50 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">{account.name || account.email}</p>
              {account.email && account.name && (
                <p className="text-sm text-muted-foreground">{account.email}</p>
              )}
            </div>
            
            {renderExtra && (
              <div className="mr-4">
                {renderExtra(account)}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {onEditName && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditName(account.id)}
                  title={t('common.edit')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleOverview(account.id, !account.showInOverview)}
                title={account.showInOverview ? t('provider.hideFromOverview') : t('provider.showInOverview')}
              >
                {account.showInOverview ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(account.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
