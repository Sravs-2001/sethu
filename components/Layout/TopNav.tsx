'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Search, Bell, HelpCircle, Settings, ChevronDown,
  Grid3X3, Plus, LogOut, User, ShieldCheck,
} from 'lucide-react'

export default function TopNav({
  onCreateIssue,
  onBackToAdmin,
}: {
  onCreateIssue: () => void
  onBackToAdmin?: () => void
}) {
  const { user } = useStore()
  const router = useRouter()
  const [searchFocused, setSearchFocused] = useState(false)
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false)
    }
    if (userMenuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  async function handleLogout() {
    setUserMenuOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav
      className="h-14 flex-shrink-0 flex items-center gap-1 px-3 z-50 select-none"
      style={{ background: '#0052CC' }}
    >
      {/* App switcher */}
      <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors flex-shrink-0">
        <Grid3X3 className="w-4 h-4 text-white" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 mr-2 ml-1">
        {/* Diamond-style logo */}
        <div className="w-7 h-7 flex items-center justify-center">
          <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
            <path d="M14 2L3 13l5 5 6-6 6 6 5-5L14 2z" fill="white" opacity="0.9" />
            <path d="M14 26L3 15l5-5 6 6 6-6 5 5-11 11z" fill="white" opacity="0.6" />
          </svg>
        </div>
        <span className="text-white font-bold text-[15px] tracking-tight">Sethu</span>
      </div>

      {/* Nav links */}
      <div className="flex items-center">
        {[
          { label: 'Your work' },
          { label: 'Projects', dropdown: true },
          { label: 'Filters', dropdown: true },
          { label: 'Dashboards', dropdown: true },
          { label: 'People', dropdown: true },
          { label: 'Apps', dropdown: true },
        ].map(({ label, dropdown }) => (
          <button
            key={label}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[13px] font-medium text-white/85 hover:text-white hover:bg-white/10 rounded transition-colors whitespace-nowrap"
          >
            {label}
            {dropdown && <ChevronDown className="w-3 h-3 opacity-70" />}
          </button>
        ))}
      </div>

      {/* Create button */}
      <button
        onClick={onCreateIssue}
        className="ml-2 px-4 py-1.5 rounded text-[13px] font-semibold transition-colors flex items-center gap-1.5 flex-shrink-0"
        style={{ background: 'white', color: '#0052CC' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#E6EFFD')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'white')}
      >
        <Plus className="w-3.5 h-3.5" />
        Create
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
        <input
          className="pl-8 pr-3 py-1.5 text-[13px] rounded text-white placeholder-white/60 focus:outline-none focus:bg-white/20"
          style={{
            background: 'rgba(255,255,255,0.15)',
            width: searchFocused ? '220px' : '160px',
            transition: 'width 0.2s ease',
          }}
          placeholder="Search"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </div>

      {/* Icon buttons */}
      <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0">
        <Bell className="w-4 h-4" />
      </button>
      <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0">
        <HelpCircle className="w-4 h-4" />
      </button>
      <button className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0">
        <Settings className="w-4 h-4" />
      </button>

      {/* User avatar + dropdown */}
      <div className="relative flex-shrink-0 ml-1" ref={userMenuRef}>
        <button
          onClick={() => setUserMenuOpen(o => !o)}
          className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-white/40 transition-all"
          style={{ background: '#0747A6' }}
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center h-full w-full text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          )}
        </button>

        {userMenuOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-56 bg-white rounded overflow-hidden animate-slide-in"
            style={{ boxShadow: '0 8px 24px rgba(9,30,66,0.25)', border: '1px solid #DFE1E6' }}
          >
            <div className="px-4 py-3 border-b border-[#DFE1E6]">
              <div className="text-sm font-semibold text-[#172B4D]">{user?.name ?? 'User'}</div>
              <div className="text-xs text-[#5E6C84] capitalize mt-0.5">{user?.role ?? 'member'}</div>
            </div>
            <div className="py-1">
              <button className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors text-left">
                <User className="w-3.5 h-3.5 text-[#5E6C84]" />
                Profile
              </button>
              {user?.role === 'admin' && onBackToAdmin && (
                <button
                  onClick={() => { setUserMenuOpen(false); onBackToAdmin() }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors text-left"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  Admin Panel
                </button>
              )}
              <div className="h-px mx-3 my-1" style={{ background: '#DFE1E6' }} />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5 text-[#5E6C84]" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
