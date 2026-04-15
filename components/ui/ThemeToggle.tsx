'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        flex items-center gap-1.5 rounded transition-all duration-200
        ${compact
          ? 'p-1.5 text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white'
          : 'px-3 py-1.5 text-sm font-medium'
        }
      `}>
      {theme === 'dark'
        ? <Sun  className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
      {!compact && (
        <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
      )}
    </button>
  )
}
