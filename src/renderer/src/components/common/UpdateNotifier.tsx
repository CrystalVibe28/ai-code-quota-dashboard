import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from '@/hooks/useToast'
import { useUpdateStore } from '@/stores/useUpdateStore'
import { ToastAction } from '@/components/ui/toast'

export function UpdateNotifier() {
  const { t } = useTranslation()
  const {
    downloadState,
    latestVersion,
    skippedVersion,
    initialize,
    skipVersion,
    startUpdate
  } = useUpdateStore()
  const notifiedVersion = useRef<string | null>(null)

  useEffect(() => {
    return initialize()
  }, [initialize])

  useEffect(() => {
    if (
      downloadState !== 'downloaded' ||
      !latestVersion ||
      latestVersion === skippedVersion ||
      latestVersion === notifiedVersion.current
    ) return

    notifiedVersion.current = latestVersion
    toast({
      variant: 'info',
      title: t('settings.update.updateReady'),
      description: t('settings.update.updateReadyDesc', { version: latestVersion }),
      action: (
        <div className="flex gap-2 mt-2">
          <ToastAction
            altText={t('settings.update.startUpdate')}
            onClick={() => startUpdate()}
          >
            {t('settings.update.startUpdate')}
          </ToastAction>
          <ToastAction
            altText={t('settings.update.skipVersion')}
            onClick={() => skipVersion(latestVersion)}
            className="text-muted-foreground hover:text-foreground"
          >
            {t('settings.update.skipVersion')}
          </ToastAction>
        </div>
      )
    })
  }, [downloadState, latestVersion, skipVersion, skippedVersion, startUpdate, t])

  return null
}
