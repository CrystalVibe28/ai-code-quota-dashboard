import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getAiStudioOAuthDocsUrl } from '@/constants/aiStudio'

interface Props {
  idPrefix: string
  onSaved: () => void
}

export function AiStudioOAuthCredentialsForm({ idPrefix, onSaved }: Props) {
  const { t, i18n } = useTranslation()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const docsUrl = getAiStudioOAuthDocsUrl(i18n.resolvedLanguage || i18n.language)

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError(t('aiStudio.oauthCredentials.required'))
      return
    }

    setIsSaving(true)
    setError('')
    try {
      if (!await window.api.aiStudio.saveOAuthCredentials(clientId, clientSecret)) {
        setError(t('aiStudio.oauthCredentials.saveFailed'))
        return
      }

      setClientId('')
      setClientSecret('')
      onSaved()
    } catch {
      setError(t('aiStudio.oauthCredentials.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-secondary/30 p-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-google-client-id`}>
          {t('aiStudio.oauthCredentials.clientId')}
        </Label>
        <Input
          id={`${idPrefix}-google-client-id`}
          value={clientId}
          placeholder={t('aiStudio.oauthCredentials.clientIdPlaceholder')}
          onChange={(event) => setClientId(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          disabled={isSaving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-google-client-secret`}>
          {t('aiStudio.oauthCredentials.clientSecret')}
        </Label>
        <Input
          id={`${idPrefix}-google-client-secret`}
          type="password"
          value={clientSecret}
          placeholder={t('aiStudio.oauthCredentials.clientSecretPlaceholder')}
          onChange={(event) => setClientSecret(event.target.value)}
          autoComplete="new-password"
          spellCheck={false}
          disabled={isSaving}
        />
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        {t('aiStudio.oauthCredentials.securityNote')}
      </p>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {t(isSaving ? 'aiStudio.oauthCredentials.saving' : 'aiStudio.oauthCredentials.save')}
        </Button>
        <Button asChild variant="outline">
          <a href={docsUrl} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" />
            {t('aiStudio.oauthCredentials.setupGuide')}
          </a>
        </Button>
      </div>
    </div>
  )
}
