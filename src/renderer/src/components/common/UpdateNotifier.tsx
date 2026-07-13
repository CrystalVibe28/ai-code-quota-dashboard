import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from '@/hooks/useToast'
import { useUpdateStore } from '@/stores/useUpdateStore'
import { ToastAction } from '@/components/ui/toast'
import type { UpdateInfo } from '@shared/types/update'

export function UpdateNotifier() {
  const { t } = useTranslation()
  const { skipVersion, openReleasePage, initialize, skippedVersion } = useUpdateStore()

  useEffect(() => {
    return initialize()
  }, [initialize])

  useEffect(() => {
    const cleanup = window.api.update.onUpdateAvailable((info) => {
      const updateInfo = info as UpdateInfo
      
      // Don't show toast if user has skipped this version
      if (skippedVersion && updateInfo.latestVersion === skippedVersion) {
        return
      }

      toast({
        variant: 'info',
        title: t('settings.update.updateAvailable'),
        description: t('settings.update.updateAvailableDesc', { version: updateInfo.latestVersion }),
        action: (
          <div className="flex gap-2 mt-2">
            <ToastAction
              altText={t('settings.update.viewRelease')}
              onClick={() => openReleasePage()}
            >
              {t('settings.update.viewRelease')}
            </ToastAction>
            <ToastAction
              altText={t('settings.update.skipVersion')}
              onClick={() => skipVersion(updateInfo.latestVersion)}
              className="text-muted-foreground hover:text-foreground"
            >
              {t('settings.update.skipVersion')}
            </ToastAction>
          </div>
        )
      })
    })

    return cleanup
  }, [openReleasePage, skipVersion, skippedVersion, t])

  return null
}
