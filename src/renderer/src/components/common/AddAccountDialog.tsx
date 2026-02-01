import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, CheckCircle2, Loader2 } from 'lucide-react'
import { PROVIDERS } from '@/constants/providers'
import { useAntigravityStore } from '@/stores/useAntigravityStore'
import { useGithubCopilotStore } from '@/stores/useGithubCopilotStore'
import { useZaiCodingStore } from '@/stores/useZaiCodingStore'
import type { ProviderId } from '@/types/customization'

interface AddAccountDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AddAccountDialog({ isOpen, onClose }: AddAccountDialogProps) {
  const { t } = useTranslation()
  
  // Form state
  const [displayName, setDisplayName] = useState('')
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>(PROVIDERS[0].id)
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // OAuth state
  const [oauthStep, setOauthStep] = useState<'initial' | 'success'>('initial')
  const [connectedAccount, setConnectedAccount] = useState<any>(null)
  
  // Stores
  const { login: antigravityLogin, updateAccount: updateAntigravity, fetchAccounts: fetchAntigravity } = useAntigravityStore()
  const { login: githubLogin, updateAccount: updateGithub, fetchAccounts: fetchGithub } = useGithubCopilotStore()
  const { addAccount: addZaiAccount, fetchAccounts: fetchZai } = useZaiCodingStore()
  
  const selectedProvider = PROVIDERS.find(p => p.id === selectedProviderId) || PROVIDERS[0]
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      const defaultProvider = PROVIDERS[0]
      setDisplayName(defaultProvider.name)
      setSelectedProviderId(defaultProvider.id)
      setApiKey('')
      setError('')
      setIsLoading(false)
      setOauthStep('initial')
      setConnectedAccount(null)
    }
  }, [isOpen])
  
  // Update displayName and reset OAuth state when provider changes
  useEffect(() => {
    // Only update displayName if it matches the previous provider's name
    // (i.e., user hasn't modified it)
    const prevProvider = PROVIDERS.find(p => p.name === displayName)
    if (prevProvider || displayName === '') {
      setDisplayName(selectedProvider.name)
    }
    
    setOauthStep('initial')
    setConnectedAccount(null)
    setApiKey('')
    setError('')
  }, [selectedProviderId])
  
  if (!isOpen) return null
  
  const handleProviderChange = (value: string) => {
    setSelectedProviderId(value as ProviderId)
  }
  
  const handleOAuthLogin = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      let result: { success: boolean; account?: any; error?: string }
      
      if (selectedProviderId === 'antigravity') {
        result = await antigravityLogin()
      } else if (selectedProviderId === 'githubCopilot') {
        result = await githubLogin()
      } else {
        result = { success: false, error: 'Unknown provider' }
      }
      
      if (result.success && result.account) {
        setConnectedAccount(result.account)
        setOauthStep('success')
        
        // Update display name from account info if user hasn't customized it
        const accountName = result.account.name || result.account.login || result.account.email
        if (displayName === selectedProvider.name && accountName) {
          setDisplayName(accountName)
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
  
  const handleSubmit = async () => {
    const finalDisplayName = displayName.trim() || selectedProvider.name
    
    setIsLoading(true)
    setError('')
    
    try {
      if (selectedProvider.mode === 'apiKey') {
        // API Key mode (Zai Coding)
        if (!apiKey.trim()) {
          setError(t('addAccount.pleaseEnterApiKey'))
          setIsLoading(false)
          return
        }
        
        const result = await addZaiAccount(finalDisplayName, apiKey.trim())
        
        if (result.success) {
          await fetchZai()
          onClose()
        } else {
          setError(result.error || t('addAccount.failedToAddAccount'))
        }
      } else {
        // OAuth mode - account already created, just update display name
        if (!connectedAccount?.id) {
          setError(t('addAccount.pleaseLoginFirst'))
          setIsLoading(false)
          return
        }
        
        if (selectedProviderId === 'antigravity') {
          await updateAntigravity(connectedAccount.id, { displayName: finalDisplayName })
          await fetchAntigravity()
        } else if (selectedProviderId === 'githubCopilot') {
          await updateGithub(connectedAccount.id, { displayName: finalDisplayName })
          await fetchGithub()
        }
        
        onClose()
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setIsLoading(false)
    }
  }
  
  const canSubmit = () => {
    if (selectedProvider.mode === 'apiKey') {
      return apiKey.trim().length > 0
    }
    return oauthStep === 'success' && connectedAccount
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[450px] animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('addAccount.addProvider')}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">{t('addAccount.displayName')}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          {/* Provider Selection - Dropdown */}
          <div className="space-y-2">
            <Label>{t('addAccount.selectProvider')}</Label>
            <Select 
              value={selectedProviderId} 
              onValueChange={handleProviderChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((provider) => {
                  const Icon = provider.icon
                  return (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{provider.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({provider.mode === 'oauth' ? 'OAuth' : 'API Key'})
                        </span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Authentication Section */}
          {selectedProvider.mode === 'apiKey' ? (
            <div className="space-y-2">
              <Label htmlFor="apiKey">{t('addAccount.apiKey')}</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={t('addAccount.apiKeyPlaceholder')}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isLoading}
              />
            </div>
          ) : (
            <div className="space-y-2">
              {oauthStep === 'initial' ? (
                <Button
                  onClick={handleOAuthLogin}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.signingIn')}
                    </>
                  ) : (
                    t('addAccount.signInWith', { provider: selectedProvider.oauthProvider })
                  )}
                </Button>
              ) : (
                <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-md flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {t('addAccount.connectedAs', { 
                      user: connectedAccount?.login || connectedAccount?.email || connectedAccount?.name || 'User' 
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !canSubmit()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.adding')}
                </>
              ) : (
                t('common.add')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
