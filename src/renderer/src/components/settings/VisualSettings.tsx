import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { SettingsSelect } from '@/components/settings/SettingsSelect'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { ACCENT_COLORS } from '@/constants/customization'
import { Palette, Sun, Moon, Monitor, Check } from 'lucide-react'
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
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateGlobal({ theme: value })}
                aria-pressed={global.theme === value}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  global.theme === value
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-input bg-card hover:bg-secondary'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
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
                type="button"
                onClick={() => updateGlobal({ accentColor: color.id })}
                aria-label={t(color.label)}
                aria-pressed={global.accentColor === color.id}
                className={cn(
                  'grid h-11 w-11 cursor-pointer place-items-center rounded-full border-4 border-card shadow-fluent-2 ring-offset-2 ring-offset-background transition-shadow duration-150 hover:shadow-fluent-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  global.accentColor === color.id && 'ring-2 ring-primary'
                )}
                style={{ backgroundColor: `hsl(${color.value})` }}
                title={t(color.label)}
              >
                {global.accentColor === color.id && (
                  <Check className="h-4 w-4 text-white drop-shadow" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="fluent-setting-row">
          <div>
            <Label htmlFor="progressStyle">{t('customization.visual.progressStyle')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.visual.progressStyleDesc')}
            </p>
          </div>
          <SettingsSelect
            id="progressStyle"
            value={global.progressStyle}
            onValueChange={(value) => updateGlobal({ progressStyle: value as 'solid' | 'gradient' | 'striped' })}
            options={[
              { value: 'solid', label: t('customization.visual.progressOptions.solid') },
              { value: 'gradient', label: t('customization.visual.progressOptions.gradient') },
              { value: 'striped', label: t('customization.visual.progressOptions.striped') }
            ]}
          />
        </div>

        <div className="fluent-setting-row">
          <div>
            <Label htmlFor="cardRadius">{t('customization.visual.cardRadius')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('customization.visual.cardRadiusDesc')}
            </p>
          </div>
          <SettingsSelect
            id="cardRadius"
            value={global.cardRadius}
            onValueChange={(value) => updateGlobal({ cardRadius: value as 'none' | 'sm' | 'md' | 'lg' })}
            options={[
              { value: 'none', label: t('customization.visual.radiusOptions.none') },
              { value: 'sm', label: t('customization.visual.radiusOptions.sm') },
              { value: 'md', label: t('customization.visual.radiusOptions.md') },
              { value: 'lg', label: t('customization.visual.radiusOptions.lg') }
            ]}
          />
        </div>
      </CardContent>
    </Card>
  )
}
