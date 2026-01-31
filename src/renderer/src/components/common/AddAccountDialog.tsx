import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddAccountDialogProps {
  title: string
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string, apiKey: string) => Promise<{ success: boolean; error?: string }>
  apiKeyPlaceholder?: string
  mode?: 'apiKey' | 'oauth'
  oauthProviderName?: string
  onLogin?: () => Promise<{ success: boolean; account?: any; error?: string }>
}

export function AddAccountDialog({
  title,
  isOpen,
  onClose,
  onSubmit,
  apiKeyPlaceholder,
  mode = 'apiKey',
  oauthProviderName,
  onLogin
}: AddAccountDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const [oauthStep, setOauthStep] = useState<'initial' | 'login' | 'success'>('initial')
  const [connectedAccount, setConnectedAccount] = useState<any>(null)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setApiKey('')
      setError('')
      setIsLoading(false)
      setOauthStep('initial')
      setConnectedAccount(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleApiKeySubmit = async () => {
    if (!name.trim()) {
      setError(t('addAccount.pleaseEnterName'))
      return
    }

    if (!apiKey.trim()) {
      setError(t('addAccount.pleaseEnterApiKey'))
      return
    }

    setIsLoading(true)
    setError('')

    const result = await onSubmit(name.trim(), apiKey.trim())
    
    if (result.success) {
      onClose()
    } else {
      setError(result.error || t('addAccount.failedToAddAccount'))
    }

    setIsLoading(false)
  }

  const handleOAuthLogin = async () => {
    if (!onLogin) return

    setIsLoading(true)
    setError('')
    
    try {
      const result = await onLogin()
      if (result.success && result.account) {
        setConnectedAccount(result.account)
        setOauthStep('success')
        
        if (!name.trim() && (result.account.name || result.account.login || result.account.email)) {
          setName(result.account.name || result.account.login || result.account.email)
        }
      } else {
        setError(result.error || t('provider.loginFailed'))
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthFinalize = async () => {
    if (!name.trim()) {
      setError(t('addAccount.pleaseEnterName'))
      return
    }
    
    setIsLoading(true)
    const result = await onSubmit(name.trim(), 'oauth-token')
    
    if (result.success) {
      onClose()
    } else {
      setError(result.error || t('addAccount.failedToAddAccount'))
    }
    setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[450px] animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('addAccount.name')}</Label>
            <Input
              id="name"
              placeholder={t('addAccount.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          {mode === 'apiKey' && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">{apiKeyPlaceholder || t('addAccount.apiKey')}</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={apiKeyPlaceholder || t('addAccount.apiKey')}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          {mode === 'oauth' && oauthStep === 'success' && connectedAccount && (
            <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-md flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {t('addAccount.connectedAs', { 
                  user: connectedAccount.login || connectedAccount.email || connectedAccount.name || 'User' 
                })}
              </span>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            
            {mode === 'apiKey' ? (
              <Button onClick={handleApiKeySubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.adding')}
                  </>
                ) : (
                  t('provider.addAccount')
                )}
              </Button>
            ) : (
              <>
                {oauthStep === 'initial' && (
                  <Button onClick={handleOAuthLogin} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.signingIn')}
                      </>
                    ) : (
                      t('addAccount.signInWith', { provider: oauthProviderName })
                    )}
                  </Button>
                )}
                {oauthStep === 'success' && (
                  <Button onClick={handleOAuthFinalize} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.saving')}
                      </>
                    ) : (
                      t('provider.addAccount')
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
