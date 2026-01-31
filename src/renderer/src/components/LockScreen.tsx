import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react'

export function LockScreen() {
  const { t } = useTranslation()
  const { hasPassword, checkAuth, unlock, setPassword, skipPassword } = useAuthStore()
  const [password, setPasswordValue] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleUnlock = async () => {
    if (!password) {
      setError(t('auth.pleaseEnterPassword'))
      return
    }

    setIsLoading(true)
    setError('')

    const success = await unlock(password)
    if (!success) {
      setError(t('auth.incorrectPassword'))
    }

    setIsLoading(false)
  }

  const handleSetPassword = async () => {
    if (!password) {
      setError(t('auth.pleaseEnterPassword'))
      return
    }

    if (password.length < 4) {
      setError(t('auth.passwordMinLength'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'))
      return
    }

    setIsLoading(true)
    setError('')

    const success = await setPassword(password)
    if (!success) {
      setError(t('auth.failedToSetPassword'))
    }

    setIsLoading(false)
  }

  const handleSkipPassword = async () => {
    setIsLoading(true)
    setError('')

    const success = await skipPassword()
    if (!success) {
      setError(t('auth.failedToSkipPassword'))
    }

    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      hasPassword ? handleUnlock() : handleSetPassword()
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {hasPassword ? t('auth.unlock') : t('auth.setMasterPassword')}
          </CardTitle>
          <CardDescription>
            {hasPassword
              ? t('auth.enterPasswordToAccess')
              : t('auth.createPasswordToProtect')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showSkipConfirm ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    {t('auth.skipPasswordWarningTitle')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.skipPasswordWarningDesc')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSkipConfirm(false)}
                  disabled={isLoading}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleSkipPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="animate-spin">...</span>
                  ) : (
                    t('auth.confirmSkip')
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.password')}
                  value={password}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {!hasPassword && (
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              )}

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                className="w-full"
                onClick={hasPassword ? handleUnlock : handleSetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="animate-spin">...</span>
                ) : hasPassword ? (
                  t('auth.unlock')
                ) : (
                  t('auth.setPassword')
                )}
              </Button>

              {!hasPassword && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowSkipConfirm(true)}
                  disabled={isLoading}
                >
                  {t('auth.skipPassword')}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
