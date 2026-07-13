import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'

interface RemovePasswordDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function RemovePasswordDialog({ isOpen, onClose }: RemovePasswordDialogProps) {
  const { t } = useTranslation()
  const { removePassword } = useAuthStore()
  
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setPassword('')
      setError('')
      setIsLoading(false)
      setShowPassword(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!password) {
      setError(t('security.incorrectPassword'))
      return
    }

    setIsLoading(true)
    setError('')

    const success = await removePassword(password)

    if (success) {
      onClose()
    } else {
      setError(useAuthStore.getState().error || t('security.incorrectPassword'))
    }

    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <Card className="w-full max-w-[450px] animate-in fade-in zoom-in-95 shadow-fluent-64 duration-200" role="dialog" aria-modal="true" aria-labelledby="remove-password-title">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle id="remove-password-title">{t('security.removePassword')}</CardTitle>
          <Button variant="ghost" size="icon" className="shadow-none" onClick={onClose} disabled={isLoading} aria-label={t('common.dismiss')}>
            <X aria-hidden="true" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm font-medium">
              {t('security.removePasswordWarning')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t('security.currentPassword')}</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 text-muted-foreground shadow-none hover:text-foreground"
                aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {t('security.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  {t('common.loading')}
                </>
              ) : (
                t('security.removePassword')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
