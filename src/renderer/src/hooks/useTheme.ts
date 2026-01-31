import { useEffect } from 'react'
import { useCustomizationStore } from '@/stores/useCustomizationStore'
import { ACCENT_COLORS } from '@/constants/customization'

export function useTheme() {
  const { global } = useCustomizationStore()
  const { theme, accentColor } = global

  useEffect(() => {
    const root = document.documentElement
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
    
    root.classList.remove('light', 'dark')
    root.classList.add(isDark ? 'dark' : 'light')
    
    const accent = ACCENT_COLORS.find(c => c.id === accentColor)
    if (accent) {
      root.style.setProperty('--primary', accent.value)
    }
  }, [theme, accentColor])

  useEffect(() => {
    if (global.theme !== 'system') return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(e.matches ? 'dark' : 'light')
    }
    
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [global.theme])
}
