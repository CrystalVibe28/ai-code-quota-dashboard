import { useEffect } from 'react'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { ACCENT_COLORS } from '@/constants/customization'

export function useTheme() {
  const { global } = useCustomizationStore()
  const { theme, accentColor } = global

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const accent = ACCENT_COLORS.find(c => c.id === accentColor)

    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches)
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(isDark ? 'dark' : 'light')

      if (accent) {
        root.style.setProperty('--primary', isDark ? accent.darkValue : accent.value)
        root.style.setProperty('--ring', isDark ? accent.darkValue : accent.value)
        root.style.setProperty('--brand-background', accent.value)
      }
    }

    applyTheme()
    if (theme !== 'system') return

    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [theme, accentColor])
}
