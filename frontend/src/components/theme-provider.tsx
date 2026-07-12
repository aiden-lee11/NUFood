'use client'

import * as React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  // Skip the cross-fade on the very first paint so the initial load doesn't flash.
  const isFirstRun = React.useRef(true)

  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = () => {
      root.classList.remove('light', 'dark')

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light'

        root.classList.add(systemTheme)
        return
      }

      root.classList.add(theme)
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    // View Transitions API cross-fades the whole page when the theme class swaps.
    // Feature-detect it, skip it on first paint, and honor reduced-motion.
    const startViewTransition = (
      document as Document & {
        startViewTransition?: (cb: () => void) => void
      }
    ).startViewTransition

    if (
      isFirstRun.current ||
      prefersReducedMotion ||
      typeof startViewTransition !== 'function'
    ) {
      isFirstRun.current = false
      applyTheme()
      return
    }

    startViewTransition.call(document, applyTheme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}

