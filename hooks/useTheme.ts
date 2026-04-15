'use client'

import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import type { Theme } from '@/types'

const STORAGE_KEY = 'sethu-theme'

export function useTheme() {
  const { theme, setTheme } = useStore()

  // Init from localStorage on first mount
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'light'
    applyTheme(saved)
    setTheme(saved)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyTheme(t: Theme) {
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return { theme, toggle }
}
