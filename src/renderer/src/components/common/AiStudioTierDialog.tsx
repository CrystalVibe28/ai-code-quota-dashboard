import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { AiStudioPaidTier } from '@shared/types'

interface Props {
  isOpen: boolean
  currentTier: AiStudioPaidTier
  onClose: () => void
  onSave: (tier: AiStudioPaidTier) => Promise<boolean>
}

const paidTiers: AiStudioPaidTier[] = ['tier1', 'tier2', 'tier3']

export function AiStudioTierDialog({ isOpen, currentTier, onClose, onSave }: Props) {
  const { t } = useTranslation()
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  const [tier, setTier] = useState<AiStudioPaidTier>(currentTier)
  const [isLoading, setIsLoading] = useState(false)

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

  useEffect(() => {
    if (!isOpen) return
    setTier(currentTier)
    setIsLoading(false)
  }, [currentTier, isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    setIsLoading(true)
    if (await onSave(tier)) onClose()
    setIsLoading(false)
  }

  return (
    <dialog
      ref={setDialog}
      className="m-auto w-[calc(100%-32px)] max-w-[440px] overflow-hidden rounded-xl border bg-card p-0 text-card-foreground shadow-fluent-64 backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
      aria-labelledby="ai-studio-tier-title"
      aria-describedby="ai-studio-tier-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!isLoading) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isLoading) onClose()
      }}
    >
      <div onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <h2 id="ai-studio-tier-title" className="text-xl font-semibold leading-[26px]">
            {t('aiStudio.tierSettings.title')}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-mr-2 shadow-none"
            onClick={onClose}
            disabled={isLoading}
            aria-label={t('common.dismiss')}
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className="space-y-5 p-5">
          <p id="ai-studio-tier-description" className="text-sm leading-5 text-muted-foreground">
            {t('aiStudio.tierSettings.description')}
          </p>

          <div className="space-y-2">
            <Label htmlFor="ai-studio-tier">{t('aiStudio.tierSettings.label')}</Label>
            <Select value={tier} onValueChange={(value) => setTier(value as AiStudioPaidTier)} disabled={isLoading}>
              <SelectTrigger id="ai-studio-tier" autoFocus>
                <SelectValue />
              </SelectTrigger>
              <SelectContent container={dialog}>
                {paidTiers.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`aiStudio.tiers.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
