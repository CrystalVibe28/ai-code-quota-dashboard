import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { ACCENT_COLORS } from '@/constants/customization'
import { Palette, Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

export function VisualSettings() {
  const { t } = useTranslation()
  const { global, updateGlobal } = useCustomizationStore()

  const themeOptions = [
    { value: 'light', icon: Sun, label: t('customization.visual.light') },
    { value: 'dark', icon: Moon, label: t('customization.visual.dark') },
    { value: 'system', icon: Monitor, label: t('customization.visual.system') }
  ] as const

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          {t('customization.visual.title')}
        </CardTitle>
        <CardDescription>{t('customization.visual.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-3 block">{t('customization.visual.theme')}</Label>
          <div className="flex gap-2">
            {themeOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => updateGlobal({ theme: value })}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                  global.theme === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-accent'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-3 block">{t('customization.visual.accentColor')}</Label>
          <div className="flex gap-2 flex-wrap">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => updateGlobal({ accentColor: color.id })}
                className={cn(
                  'w-10 h-10 rounded-full border-2 transition-transform hover:scale-110',
                  global.accentColor === color.id ? 'border-foreground scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: `hsl(${color.value})` }}
                title={t(color.label)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="progressStyle">{t('customization.visual.progressStyle')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.visual.progressStyleDesc')}
            </p>
          </div>
          <select
            id="progressStyle"
            value={global.progressStyle}
            onChange={(e) => updateGlobal({ progressStyle: e.target.value as 'solid' | 'gradient' | 'striped' })}
            className="w-32 bg-background border border-input rounded-md px-3 py-2 text-sm"
          >
            <option value="solid">{t('customization.visual.progressOptions.solid')}</option>
            <option value="gradient">{t('customization.visual.progressOptions.gradient')}</option>
            <option value="striped">{t('customization.visual.progressOptions.striped')}</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="cardRadius">{t('customization.visual.cardRadius')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.visual.cardRadiusDesc')}
            </p>
          </div>
          <select
            id="cardRadius"
            value={global.cardRadius}
            onChange={(e) => updateGlobal({ cardRadius: e.target.value as 'none' | 'sm' | 'md' | 'lg' })}
            className="w-32 bg-background border border-input rounded-md px-3 py-2 text-sm"
          >
            <option value="none">{t('customization.visual.radiusOptions.none')}</option>
            <option value="sm">{t('customization.visual.radiusOptions.sm')}</option>
            <option value="md">{t('customization.visual.radiusOptions.md')}</option>
            <option value="lg">{t('customization.visual.radiusOptions.lg')}</option>
          </select>
        </div>
      </CardContent>
    </Card>
  )
}
