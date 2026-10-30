// Light / dark mode. The choice is per device (localStorage), never synced,
// so each person picks what suits their own phone. "system" follows the
// device setting; index.html applies the saved choice before first paint.
import { useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'
export const THEME_KEY = 'isw-theme'

export const THEME_LABELS: Record<ThemeChoice, string> = {
  system: 'Match device',
  light: 'Light',
  dark: 'Dark',
}

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* private mode etc. */
  }
  return 'system'
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
}

export function useTheme(): [ThemeChoice, (c: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(readTheme)
  useEffect(() => {
    applyTheme(choice)
    try {
      if (choice === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, choice)
    } catch {
      /* ignore */
    }
  }, [choice])
  return [choice, setChoice]
}

/** True when the page is currently showing dark colors (choice or device). */
export function isDarkNow(choice: ThemeChoice): boolean {
  if (choice !== 'system') return choice === 'dark'
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}
