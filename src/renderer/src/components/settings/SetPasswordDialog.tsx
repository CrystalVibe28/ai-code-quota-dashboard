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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[450px] animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('security.setPassword')}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isLoading}>
            <X className="h-4 w-4" />
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
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
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
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {t('security.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
