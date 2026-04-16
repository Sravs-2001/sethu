'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, X, Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { notificationService } from '@/lib/services'
import { formatDistanceToNow } from 'date-fns'
import type { Notification } from '@/types'

// ── Notification type icon ─────────────────────────────────────────────────────

const TYPE_ICON: Record<Notification['type'], string> = {
  task_assigned:  '👤',
  status_changed: '🔄',
  mentioned:      '@',
  invite_received:'📨',
  comment_added:  '💬',
  due_soon:       '📅',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const { user, notifications, setNotifications, markNotificationRead, markAllNotificationsRead } = useStore()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.read).length

  // ── Load notifications ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    setLoading(true)
    notificationService.getByUser(user.id).then(({ data }) => {
      if (data) setNotifications(data as Notification[])
      setLoading(false)
    })
  }, [user?.id])

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    return notificationService.subscribe(user.id, n => useStore.getState().addNotification(n))
  }, [user?.id])

  // ── Close panel on outside click ─────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Mark read ─────────────────────────────────────────────────────────────
  async function handleMarkRead(id: string) {
    await notificationService.markRead(id)
    markNotificationRead(id)
  }

  async function handleMarkAllRead() {
    if (!user || unread === 0) return
    await notificationService.markAllRead(user.id)
    markAllNotificationsRead()
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        className="relative p-1.5 rounded transition-colors"
        style={{ color: 'rgba(255,255,255,0.6)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'white' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}>
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 text-[9px] font-bold text-white rounded-full flex items-center justify-center"
            style={{ background: '#DE350B' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-xl overflow-hidden z-50"
          style={{
            background:  'var(--bg-card)',
            border:      '1px solid var(--border)',
            boxShadow:   '0 8px 32px rgba(9,30,66,0.22)',
          }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5" style={{ color: 'var(--t3)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--t1)' }}>Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors"
                  style={{ color: 'var(--blue)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--blue-bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <CheckCheck className="w-3 h-3" /> All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--t4)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t4)' }} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <Bell className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--t5)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--t3)' }}>All caught up!</p>
                <p className="text-xs mt-1" style={{ color: 'var(--t5)' }}>No notifications yet.</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className="flex gap-3 px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    background:   n.read ? 'transparent' : 'var(--blue-nav)',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'var(--blue-nav)'}
                  onClick={() => !n.read && handleMarkRead(n.id)}>

                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: 'var(--bg-raised)' }}>
                    {TYPE_ICON[n.type] ?? '🔔'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--t1)' }}>
                      {n.title}
                    </p>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--t3)' }}>
                      {n.body}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--t5)' }}>
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                      style={{ background: 'var(--blue)' }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
