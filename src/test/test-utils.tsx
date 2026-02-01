import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'

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
        'provider.showInOverview': 'Show in overview'
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
      {children}
    </I18nextProvider>
  )
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
