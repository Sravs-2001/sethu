'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/store/useStore'
import {
  LayoutGrid, ListTodo, Bell, FolderOpen,
  ChevronRight, Plus,
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { icon: LayoutGrid, label: 'Home',     href: '/dashboard/summary'  },
  { icon: ListTodo,   label: 'My Tasks', href: '/dashboard/my-tasks' },
  { icon: FolderOpen, label: 'Projects', href: '/dashboard/projects' },
]

export default function HomeSidebar() {
  const pathname     = usePathname()
  const { projects, setProject, user } = useStore()

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-full"
      style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>

      {/* User greeting */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5"
          style={{ color: 'var(--t4)' }}>Workspace</p>
        <p className="text-sm font-bold truncate" style={{ color: 'var(--t1)' }}>
          {user?.name ?? 'My Workspace'}
        </p>
      </div>

      {/* Main nav */}
      <nav className="px-2 py-2 space-y-0.5">
        {NAV.map(({ icon: Icon, label, href }) => {
          const active = pathname === href || (href !== '/dashboard/summary' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'text-[#0052CC] font-semibold'
                  : 'hover:bg-[rgba(0,0,0,0.04)]'
              )}
              style={{
                background: active ? 'var(--blue-bg)' : undefined,
                color: active ? 'var(--blue)' : 'var(--t2)',
              }}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Recent projects */}
      {projects.length > 0 && (
        <div className="px-2 mt-2">
          <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--t4)' }}>
            Recent projects
          </p>
          <div className="space-y-0.5">
            {projects.slice(0, 5).map(p => (
              <Link
                key={p.id}
                href="/dashboard/board"
                onClick={() => setProject(p)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors group"
                style={{ color: 'var(--t2)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
                  style={{ background: p.avatar_color }}>
                  {p.key.slice(0, 2)}
                </div>
                <span className="truncate flex-1 text-xs font-medium">{p.name}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: 'var(--t4)' }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* New project shortcut */}
      <div className="mt-auto px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <Link href="/dashboard/projects"
          className="flex items-center gap-2 text-xs font-semibold transition-colors"
          style={{ color: 'var(--blue)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
          <Plus className="w-3.5 h-3.5" />
          New project
        </Link>
      </div>
    </aside>
  )
}
