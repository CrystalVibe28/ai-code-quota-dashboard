import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/stores/useAuthStore'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { RemovePasswordDialog } from './RemovePasswordDialog'
import { SetPasswordDialog } from './SetPasswordDialog'

export function SecuritySettings() {
  const { t } = useTranslation()
  const { isPasswordSkipped } = useAuthStore()

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showRemovePassword, setShowRemovePassword] = useState(false)
  const [showSetPassword, setShowSetPassword] = useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('security.title')}
          </CardTitle>
          <CardDescription>{t('security.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!isPasswordSkipped ? (
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button variant="outline" onClick={() => setShowChangePassword(true)}>
                {t('security.changePassword')}
              </Button>
              <Button variant="outline" onClick={() => setShowRemovePassword(true)}>
                {t('security.removePassword')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('security.noPasswordWarning')}
              </p>
              <Button onClick={() => setShowSetPassword(true)}>
                {t('security.setPassword')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ChangePasswordDialog
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <RemovePasswordDialog
        isOpen={showRemovePassword}
        onClose={() => setShowRemovePassword(false)}
      />

      <SetPasswordDialog
        isOpen={showSetPassword}
        onClose={() => setShowSetPassword(false)}
      />
    </>
  )
}
