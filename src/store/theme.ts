import { useEffect } from 'react'
import { useSettings } from './settings'

/** Aplica el tema al <html> y sigue al sistema cuando el ajuste es "system". */
export function useThemeEffect(): void {
  const theme = useSettings((s) => s.settings.theme)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = (): void => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', dark ? '#020617' : '#f1f5f9')
    }

    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}
