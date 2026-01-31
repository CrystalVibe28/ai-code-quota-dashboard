import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Loader2 } from 'lucide-react'

interface EditNameDialogProps {
  isOpen: boolean
  onClose: () => void
  currentName: string
  onSave: (newName: string) => Promise<{ success: boolean; error?: string }>
}

export function EditNameDialog({
  isOpen,
  onClose,
  currentName,
  onSave
}: EditNameDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName(currentName)
      setError('')
      setIsLoading(false)
    }
  }, [isOpen, currentName])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('editName.pleaseEnterName'))
      return
    }

    setIsLoading(true)
    setError('')

    const result = await onSave(name.trim())

    if (result.success) {
      onClose()
    } else {
      setError(result.error || t('editName.failedToSave'))
    }

    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSave()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[450px] animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('editName.editAccountName')}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('editName.name')}</Label>
            <Input
              id="name"
              placeholder={t('editName.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
