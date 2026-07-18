import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Trash2 } from 'lucide-react'
import { AiStudioOAuthCredentialsForm } from '@/components/common/AiStudioOAuthCredentialsForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAiStudioOAuthDocsUrl } from '@/constants/aiStudio'

export function AiStudioOAuthSettings() {
  const { t, i18n } = useTranslation()
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const testUsersUrl = getAiStudioOAuthDocsUrl(
    i18n.resolvedLanguage || i18n.language,
    'test-users'
  )

  const loadStatus = useCallback(async () => {
    setError('')
    try {
      setIsConfigured(await window.api.aiStudio.hasOAuthCredentials())
    } catch {
      setIsConfigured(null)
      setError(t('aiStudio.oauthCredentials.loadFailed'))
    }
  }, [t])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const handleDelete = async () => {
    if (!confirm(t('aiStudio.oauthCredentials.deleteConfirm'))) return

    setIsDeleting(true)
    setError('')
    try {
      if (!await window.api.aiStudio.deleteOAuthCredentials()) {
        setError(t('aiStudio.oauthCredentials.deleteFailed'))
        return
      }
      setIsConfigured(false)
    } catch {
      setError(t('aiStudio.oauthCredentials.deleteFailed'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
          {t('aiStudio.oauthCredentials.title')}
        </CardTitle>
        <CardDescription>{t('aiStudio.oauthCredentials.settingsDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConfigured === null && !error && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('aiStudio.oauthCredentials.checking')}
          </p>
        )}

        {isConfigured === false && (
          <AiStudioOAuthCredentialsForm
            idPrefix="settings-ai-studio"
            onSaved={() => setIsConfigured(true)}
          />
        )}

        {isConfigured === true && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-success">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('aiStudio.oauthCredentials.configured')}</p>
                <p className="text-xs leading-5 opacity-80">
                  {t('aiStudio.oauthCredentials.configuredDesc')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href={testUsersUrl} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" />
                  {t('aiStudio.oauthCredentials.testUsersGuide')}
                </a>
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 aria-hidden="true" />
                )}
                {t(isDeleting ? 'aiStudio.oauthCredentials.deleting' : 'aiStudio.oauthCredentials.delete')}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="space-y-2" role="alert">
            <p className="text-sm text-destructive">{error}</p>
            {isConfigured === null && (
              <Button variant="outline" size="sm" onClick={loadStatus}>
                {t('common.tryAgain')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
