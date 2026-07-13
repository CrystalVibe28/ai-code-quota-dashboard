import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'

interface SetPasswordDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SetPasswordDialog({ isOpen, onClose }: SetPasswordDialogProps) {
  const { t } = useTranslation()
  const { setPasswordFromSettings } = useAuthStore()
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setNewPassword('')
      setConfirmPassword('')
      setError('')
      setIsLoading(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async () => {
    setError('')

    if (newPassword.length < 4) {
      setError(t('security.passwordMinLength'))
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('security.passwordsDoNotMatch'))
      return
    }

    setIsLoading(true)

    const success = await setPasswordFromSettings(newPassword)

    if (success) {
      onClose()
    } else {
      setError(useAuthStore.getState().error || t('common.unknown'))
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
      <Card className="w-full max-w-[450px] animate-in fade-in zoom-in-95 shadow-fluent-64 duration-200" role="dialog" aria-modal="true" aria-labelledby="set-password-title">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle id="set-password-title">{t('security.setPassword')}</CardTitle>
          <Button variant="ghost" size="icon" className="shadow-none" onClick={onClose} disabled={isLoading} aria-label={t('common.dismiss')}>
            <X aria-hidden="true" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('security.newPassword')}</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-0 top-0 text-muted-foreground shadow-none hover:text-foreground"
                aria-label={showNewPassword ? t('common.hidePassword') : t('common.showPassword')}
              >
                {showNewPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('security.confirmNewPassword')}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-0 top-0 text-muted-foreground shadow-none hover:text-foreground"
                aria-label={showConfirmPassword ? t('common.hidePassword') : t('common.showPassword')}
              >
                {showConfirmPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
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
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  {t('common.saving')}
                </>
              ) : (
                t('security.setPassword')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
