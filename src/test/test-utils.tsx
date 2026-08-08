import { render } from '@testing-library/react'
import type { RenderOptions, RenderResult } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import { TooltipProvider } from '@/components/ui/tooltip'

// Initialize a minimal i18n instance for testing
i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        'time.now': 'Now',
        'time.days': '{{count}}d',
        'time.hours': '{{count}}h',
        'time.minutes': '{{count}}m',
        'provider.hideFromOverview': 'Hide from overview',
        'provider.showInOverview': 'Show in overview',
        'provider.hideAll': 'Hide all',
        'provider.showAll': 'Show all',
        'history.title': 'Quota history',
        'history.weeklyTitle': 'Weekly quota history',
        'history.monthlyTitle': 'Monthly quota history',
        'history.description': 'Remaining quota, recorded at most once per hour',
        'history.empty': 'History will appear after the next refresh',
        'history.chartLabel': '{{title}} line chart',
        'history.pointLabel': '{{series}}: {{value}}% remaining at {{time}}',
        'trayPopover.title': 'Quota glance',
        'trayPopover.lastUpdated': 'Updated {{time}}',
        'trayPopover.neverUpdated': 'Not updated yet',
        'trayPopover.localCache': 'Local cached data',
        'trayPopover.providers': 'Providers',
        'trayPopover.account': 'Account',
        'trayPopover.resets': 'Resets {{time}}',
        'trayPopover.openDashboard': 'Open dashboard',
        'trayPopover.lockedTitle': 'Dashboard is locked',
        'trayPopover.lockedDescription': 'Open the dashboard to unlock your locally stored data.',
        'trayPopover.noAccountsTitle': 'No cached accounts',
        'trayPopover.noAccountsDescription': 'Open the dashboard to add an account and refresh its quota.',
        'trayPopover.noQuotaTitle': 'No quota data',
        'trayPopover.noQuotaDescription': 'Cached quota will appear after the next refresh.',
        'trayPopover.unavailableTitle': 'Usage unavailable',
        'trayPopover.unavailableDescription': 'Open the dashboard for account details.',
        'antigravity.quotaTypes.geminiWeekly': 'Gemini weekly quota',
        'codex.quotaTypes.weekly': 'Weekly quota',
        'codex.quotaTypes.rateLimitPrimary': 'Primary quota',
        'codex.quotaTypes.rateLimitSecondary': 'Secondary quota'
      }
    }
  },
  interpolation: {
    escapeValue: false
  }
})

interface WrapperProps {
  children: ReactNode
}

function AllProviders({ children }: WrapperProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </I18nextProvider>
  )
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, { wrapper: AllProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
