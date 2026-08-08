import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AiStudioOAuthCredentialsForm } from '@/components/common/AiStudioOAuthCredentialsForm'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { X, CheckCircle2, Loader2, AlertCircle, XCircle, Clock, ShieldX, ExternalLink } from 'lucide-react'
import { PROVIDERS } from '@/constants/providers'
import { getAiStudioOAuthDocsUrl } from '@/constants/aiStudio'
import { useAntigravityStore } from '@/stores/useAntigravityStore'
import { useGithubCopilotStore } from '@/stores/useGithubCopilotStore'
import { useZaiCodingStore } from '@/stores/useZaiCodingStore'
import { useCodexStore } from '@/stores/useCodexStore'
import { useOpencodeGoStore } from '@/stores/useOpencodeGoStore'
import { useOllamaCloudStore } from '@/stores/useOllamaCloudStore'
import { useAiStudioStore } from '@/stores/useAiStudioStore'
import { getGoogleApiEnableUrl } from '@/lib/googleApiError'
import type { ProviderId } from '@/types/customization'
import type { AiStudioLoginSession } from '@shared/types'

// OAuth error type detection
type OAuthErrorType = 'cancelled' | 'timeout' | 'access_denied' | 'network' | 'generic'

function detectOAuthErrorType(error: string): OAuthErrorType {
  const lowerError = error.toLowerCase()
  if (lowerError.includes('cancel') || lowerError.includes('closed') || lowerError.includes('aborted')) {
    return 'cancelled'
  }
  if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
    return 'timeout'
  }
  if (lowerError.includes('access_denied') || lowerError.includes('access denied') || lowerError.includes('permission')) {
    return 'access_denied'
  }
  if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
    return 'network'
  }
  return 'generic'
}

interface OAuthErrorDisplayProps {
  error: string
  errorType: OAuthErrorType
  onRetry: () => void
  isLoading: boolean
}

function OAuthErrorDisplay({ error, errorType, onRetry, isLoading }: OAuthErrorDisplayProps) {
  const { t } = useTranslation()
  const enableUrl = getGoogleApiEnableUrl(error)
  
  const errorConfig = {
    cancelled: {
      icon: XCircle,
      bgColor: 'bg-muted',
      textColor: 'text-muted-foreground',
      title: t('errors.oauth.cancelledTitle'),
      description: t('errors.oauth.cancelledDesc'),
      showRetry: true
    },
    timeout: {
      icon: Clock,
      bgColor: 'bg-warning/10',
      textColor: 'text-warning',
      title: t('errors.oauth.timeoutTitle'),
      description: t('errors.oauth.timeoutDesc'),
      showRetry: true
    },
    access_denied: {
      icon: ShieldX,
      bgColor: 'bg-destructive/10',
      textColor: 'text-destructive',
      title: t('errors.oauth.accessDeniedTitle'),
      description: t('errors.oauth.accessDeniedDesc'),
      showRetry: true
    },
    network: {
      icon: AlertCircle,
      bgColor: 'bg-warning/10',
      textColor: 'text-warning',
      title: t('errors.oauth.networkTitle'),
      description: t('errors.oauth.networkDesc'),
      showRetry: true
    },
    generic: {
      icon: AlertCircle,
      bgColor: 'bg-destructive/10',
      textColor: 'text-destructive',
      title: t('errors.oauth.genericTitle'),
      description: error,
      showRetry: true
    }
  }
  
  const config = errorConfig[errorType]
  const Icon = config.icon
  
  return (
    <div className={`${config.bgColor} ${config.textColor} space-y-2 rounded-md border border-current/20 p-3`} role="alert">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-medium text-sm">{config.title}</span>
      </div>
      <p className="text-xs opacity-80 pl-6">{config.description}</p>
      {enableUrl && (
        <div className="space-y-2 pl-6 text-xs">
          <p>{t('errors.googleApi.disabledDesc')}</p>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <a href={enableUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              {t('errors.googleApi.openSettings')}
            </a>
          </Button>
        </div>
      )}
      {config.showRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          disabled={isLoading}
          className="ml-6 h-7 text-xs"
        >
          {t('common.tryAgain')}
        </Button>
      )}
    </div>
  )
}

interface AddAccountDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AddAccountDialog({ isOpen, onClose }: AddAccountDialogProps) {
  const { t, i18n } = useTranslation()
  
  // Form state
  const [displayName, setDisplayName] = useState('')
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>(PROVIDERS[0].id)
  const [apiKey, setApiKey] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState<OAuthErrorType>('generic')
  const [isLoading, setIsLoading] = useState(false)
  const [aiStudioCredentialsConfigured, setAiStudioCredentialsConfigured] = useState<boolean | null>(null)
  const [aiStudioCredentialsLoadFailed, setAiStudioCredentialsLoadFailed] = useState(false)
  
  // OAuth state
  const [oauthStep, setOauthStep] = useState<'initial' | 'success'>('initial')
  const [connectedAccount, setConnectedAccount] = useState<any>(null)
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  const oauthAttemptRef = useRef(0)
  
  // Stores
  const {
    login: antigravityLogin,
    cancelLogin: cancelAntigravityLogin,
    updateAccount: updateAntigravity,
    fetchAccounts: fetchAntigravity
  } = useAntigravityStore()
  const {
    login: githubLogin,
    cancelLogin: cancelGithubLogin,
    updateAccount: updateGithub,
    fetchAccounts: fetchGithub
  } = useGithubCopilotStore()
  const { addAccount: addZaiAccount, fetchAccounts: fetchZai } = useZaiCodingStore()
  const {
    login: codexLogin,
    cancelLogin: cancelCodexLogin,
    updateAccount: updateCodex,
    fetchAccounts: fetchCodex
  } = useCodexStore()
  const {
    login: opencodeGoLogin,
    cancelLogin: cancelOpencodeGoLogin,
    updateAccount: updateOpencodeGo,
    fetchAccounts: fetchOpencodeGo
  } = useOpencodeGoStore()
  const {
    login: ollamaCloudLogin,
    cancelLogin: cancelOllamaCloudLogin,
    updateAccount: updateOllamaCloud,
    fetchAccounts: fetchOllamaCloud
  } = useOllamaCloudStore()
  const {
    login: aiStudioLogin,
    cancelLogin: cancelAiStudioLogin,
    addAccount: addAiStudioAccount
  } = useAiStudioStore()
  
  const selectedProvider = PROVIDERS.find(p => p.id === selectedProviderId) || PROVIDERS[0]

  useEffect(() => {
    if (!dialog || !isOpen) return

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }

    return () => {
      if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close()
      } else {
        dialog.removeAttribute('open')
      }
    }
  }, [dialog, isOpen])
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      const defaultProvider = PROVIDERS[0]
      setDisplayName(defaultProvider.name)
      setSelectedProviderId(defaultProvider.id)
      setApiKey('')
      setSelectedProjectId('')
      setError('')
      setErrorType('generic')
      setIsLoading(false)
      setAiStudioCredentialsConfigured(null)
      setAiStudioCredentialsLoadFailed(false)
      setOauthStep('initial')
      setConnectedAccount(null)
    }
  }, [isOpen])
  
  // Reset the provider-specific form state when provider changes
  useEffect(() => {
    setDisplayName(selectedProvider.name)
    setOauthStep('initial')
    setConnectedAccount(null)
    setApiKey('')
    setSelectedProjectId('')
    setError('')
    setErrorType('generic')
    setAiStudioCredentialsConfigured(null)
    setAiStudioCredentialsLoadFailed(false)
  }, [selectedProviderId])

  useEffect(() => {
    if (!isOpen || selectedProviderId !== 'aiStudio') return

    let active = true
    setAiStudioCredentialsConfigured(null)
    setAiStudioCredentialsLoadFailed(false)
    window.api.aiStudio.hasOAuthCredentials()
      .then((configured) => {
        if (active) setAiStudioCredentialsConfigured(configured)
      })
      .catch(() => {
        if (!active) return
        setAiStudioCredentialsConfigured(false)
        setAiStudioCredentialsLoadFailed(true)
      })

    return () => {
      active = false
    }
  }, [isOpen, selectedProviderId])
  
  if (!isOpen) return null
  
  const handleProviderChange = (value: string) => {
    setSelectedProviderId(value as ProviderId)
  }

  const isOAuthLoginInProgress = selectedProvider.mode === 'oauth' && oauthStep === 'initial' && isLoading

  const cancelActiveOAuthLogin = async (): Promise<void> => {
    try {
      if (selectedProviderId === 'antigravity') {
        await cancelAntigravityLogin()
      } else if (selectedProviderId === 'githubCopilot') {
        await cancelGithubLogin()
      } else if (selectedProviderId === 'codex') {
        await cancelCodexLogin()
      } else if (selectedProviderId === 'opencodeGo') {
        await cancelOpencodeGoLogin()
      } else if (selectedProviderId === 'ollamaCloud') {
        await cancelOllamaCloudLogin()
      } else if (selectedProviderId === 'aiStudio') {
        await cancelAiStudioLogin()
      }
    } catch {
      // Ignore cancellation errors while closing the dialog
    }
  }

  const handleClose = () => {
    if (isOAuthLoginInProgress) {
      oauthAttemptRef.current += 1
      setIsLoading(false)
      setError('')
      setErrorType('generic')
      void cancelActiveOAuthLogin()
    }

    onClose()
  }

  const handleOAuthLogin = async () => {
    const attemptId = oauthAttemptRef.current + 1
    oauthAttemptRef.current = attemptId

    setIsLoading(true)
    setError('')
    setErrorType('generic')
    
    try {
      let result: { success: boolean; account?: any; error?: string }
      
      if (selectedProviderId === 'antigravity') {
        result = await antigravityLogin()
      } else if (selectedProviderId === 'githubCopilot') {
        result = await githubLogin()
      } else if (selectedProviderId === 'codex') {
        result = await codexLogin()
      } else if (selectedProviderId === 'opencodeGo') {
        result = await opencodeGoLogin()
      } else if (selectedProviderId === 'ollamaCloud') {
        result = await ollamaCloudLogin()
      } else if (selectedProviderId === 'aiStudio') {
        result = await aiStudioLogin()
      } else {
        result = { success: false, error: 'Unknown provider' }
      }

      if (attemptId !== oauthAttemptRef.current) {
        return
      }
      
      if (result.success && result.account) {
        setConnectedAccount(result.account)
        setOauthStep('success')
        if (selectedProviderId === 'aiStudio') {
          setSelectedProjectId((result.account as AiStudioLoginSession).projects[0]?.projectId || '')
        }
      } else {
        const errorMessage = result.error || t('provider.loginFailed')
        const detectedType = detectOAuthErrorType(errorMessage)
        setError(errorMessage)
        setErrorType(detectedType)
      }
    } catch (e) {
      if (attemptId !== oauthAttemptRef.current) {
        return
      }

      const errorMessage = String(e)
      const detectedType = detectOAuthErrorType(errorMessage)
      setError(errorMessage)
      setErrorType(detectedType)
    } finally {
      if (attemptId === oauthAttemptRef.current) {
        setIsLoading(false)
      }
    }
  }
  
  const handleSubmit = async () => {
    const finalDisplayName = displayName.trim() || selectedProvider.name
    
    setIsLoading(true)
    setError('')
    
    try {
      if (selectedProvider.mode === 'apiKey') {
        // API Key mode (Zai Coding Plan)
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
        if (selectedProviderId === 'aiStudio') {
          const session = connectedAccount as AiStudioLoginSession | null
          if (!session) {
            setError(t('addAccount.pleaseLoginFirst'))
            return
          }
          const project = session.projects.find(value => value.projectId === selectedProjectId)
          if (!project) {
            setError(t('addAccount.pleaseSelectProject'))
            return
          }

          const result = await addAiStudioAccount(session, project, finalDisplayName)
          if (!result.success) {
            setError(result.error || t('addAccount.failedToAddAccount'))
            return
          }
          onClose()
          return
        }

        // Other OAuth providers create the account during login.
        if (!connectedAccount?.id) {
          setError(t('addAccount.pleaseLoginFirst'))
          return
        }
        
        if (selectedProviderId === 'antigravity') {
          await updateAntigravity(connectedAccount.id, { displayName: finalDisplayName })
          await fetchAntigravity()
        } else if (selectedProviderId === 'githubCopilot') {
          await updateGithub(connectedAccount.id, { displayName: finalDisplayName })
          await fetchGithub()
        } else if (selectedProviderId === 'codex') {
          await updateCodex(connectedAccount.id, { displayName: finalDisplayName })
          await fetchCodex()
        } else if (selectedProviderId === 'opencodeGo') {
          await updateOpencodeGo(connectedAccount.id, { displayName: finalDisplayName })
          await fetchOpencodeGo()
        } else if (selectedProviderId === 'ollamaCloud') {
          await updateOllamaCloud(connectedAccount.id, { displayName: finalDisplayName })
          await fetchOllamaCloud()
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
    if (selectedProviderId === 'aiStudio') {
      return oauthStep === 'success' && connectedAccount && selectedProjectId
    }
    return oauthStep === 'success' && connectedAccount
  }

  const SelectedProviderIcon = selectedProvider.icon
  const aiStudioTestUsersUrl = getAiStudioOAuthDocsUrl(
    i18n.resolvedLanguage || i18n.language,
    'test-users'
  )

  return (
    <dialog
      ref={setDialog}
      className="m-auto max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[520px] overflow-hidden rounded-xl border bg-card p-0 text-card-foreground shadow-fluent-64 backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
      aria-labelledby="add-provider-title"
      onCancel={(event) => {
        event.preventDefault()
        handleClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose()
      }}
    >
      <div className="flex max-h-[calc(100vh-32px)] flex-col" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <h2 id="add-provider-title" className="text-xl font-semibold leading-[26px]">{t('addAccount.addProvider')}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 shadow-none"
            onClick={handleClose}
            disabled={isLoading && !isOAuthLoginInProgress}
            aria-label={t('common.dismiss')}
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-2">
            <Label htmlFor="provider">{t('addAccount.selectProvider')}</Label>
            <Select
              value={selectedProviderId}
              onValueChange={handleProviderChange}
              disabled={isLoading}
            >
              <SelectTrigger id="provider" autoFocus aria-describedby="provider-auth-mode">
                <SelectValue>
                  <span className="flex min-w-0 items-center gap-2">
                    <SelectedProviderIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate">{selectedProvider.name}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent container={dialog}>
                {PROVIDERS.map((provider) => {
                  const ProviderIcon = provider.icon

                  return (
                    <SelectItem key={provider.id} value={provider.id} textValue={provider.name} className="py-2">
                      <span className="flex items-center gap-2">
                        <ProviderIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{provider.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {provider.mode === 'oauth' ? 'OAuth' : t('addAccount.apiKey')}
                        </span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <p id="provider-auth-mode" className="text-xs leading-4 text-muted-foreground">
              {selectedProvider.mode === 'oauth'
                ? t('addAccount.oauthMode', { provider: selectedProvider.oauthProvider })
                : t('addAccount.apiKeyMode')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">{t('addAccount.displayName')}</Label>
            <Input
              id="displayName"
              value={displayName}
              placeholder={t('addAccount.displayNamePlaceholder', { provider: selectedProvider.name })}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
            />
          </div>

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
          ) : selectedProviderId === 'aiStudio' && aiStudioCredentialsConfigured !== true ? (
            <div className="space-y-3">
              {aiStudioCredentialsConfigured === null ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t('aiStudio.oauthCredentials.checking')}
                </p>
              ) : (
                <>
                  {aiStudioCredentialsLoadFailed && (
                    <p className="text-sm text-destructive" role="alert">
                      {t('aiStudio.oauthCredentials.loadFailed')}
                    </p>
                  )}
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{t('aiStudio.oauthCredentials.title')}</h3>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t('aiStudio.oauthCredentials.description')}
                    </p>
                  </div>
                  <AiStudioOAuthCredentialsForm
                    idPrefix="add-account-ai-studio"
                    onSaved={() => {
                      setAiStudioCredentialsConfigured(true)
                      setAiStudioCredentialsLoadFailed(false)
                    }}
                  />
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedProviderId === 'aiStudio' && oauthStep === 'initial' && (
                <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-sm font-medium">{t('aiStudio.oauthCredentials.testUsersHint')}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {t('aiStudio.oauthCredentials.testUsersDescription')}
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <a href={aiStudioTestUsersUrl} target="_blank" rel="noreferrer">
                      <ExternalLink aria-hidden="true" />
                      {t('aiStudio.oauthCredentials.testUsersGuide')}
                    </a>
                  </Button>
                </div>
              )}

              {oauthStep === 'initial' ? (
                <Button
                  onClick={handleOAuthLogin}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" />
                      {t('common.signingIn')}
                    </>
                  ) : (
                    t('addAccount.signInWith', { provider: selectedProvider.oauthProvider })
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success" aria-live="polite">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {t('addAccount.connectedAs', {
                      user: connectedAccount?.login || connectedAccount?.email || connectedAccount?.name || 'User'
                    })}
                  </span>
                </div>
              )}

              {oauthStep === 'success' && selectedProviderId === 'aiStudio' && (
                <div className="space-y-4 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="aiStudioProject">{t('addAccount.project')}</Label>
                    {(connectedAccount as AiStudioLoginSession).projects.length > 0 ? (
                      <Select
                        value={selectedProjectId}
                        onValueChange={setSelectedProjectId}
                        disabled={isLoading}
                      >
                        <SelectTrigger id="aiStudioProject">
                          <SelectValue placeholder={t('addAccount.selectProject')} />
                        </SelectTrigger>
                        <SelectContent container={dialog}>
                          {(connectedAccount as AiStudioLoginSession).projects.map((project) => (
                            <SelectItem key={project.projectId} value={project.projectId}>
                              {project.name} ({project.projectId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                        {t('addAccount.noProjects')}
                      </p>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {error && selectedProvider.mode === 'oauth' && (
            <OAuthErrorDisplay
              error={error}
              errorType={errorType}
              onRetry={handleOAuthLogin}
              isLoading={isLoading}
            />
          )}
          {error && selectedProvider.mode === 'apiKey' && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t bg-surface-sunken px-5 py-3">
          <Button variant="outline" onClick={handleClose} disabled={isLoading && !isOAuthLoginInProgress}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !canSubmit()}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                {t('common.adding')}
              </>
            ) : (
              t('common.add')
            )}
          </Button>
        </footer>
      </div>
    </dialog>
  )
}
