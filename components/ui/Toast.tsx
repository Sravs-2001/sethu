'use client'

import { useStore } from '@/store/useStore'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const CONFIG = {
  success: { icon: CheckCircle2, bg: '#E3FCEF', border: '#36B37E', color: '#006644', iconColor: '#36B37E' },
  error:   { icon: AlertCircle,  bg: '#FFEBE6', border: '#DE350B', color: '#BF2600', iconColor: '#DE350B' },
  warning: { icon: AlertTriangle,bg: '#FFFAE6', border: '#FF8B00', color: '#7A4800', iconColor: '#FF8B00' },
  info:    { icon: Info,         bg: '#DEEBFF', border: '#0052CC', color: '#0747A6', iconColor: '#0052CC' },
}

function ToastItem({ id, type, message }: { id: string; type: keyof typeof CONFIG; message: string }) {
  const removeToast = useStore((s) => s.removeToast)
  const [visible, setVisible] = useState(false)
  const cfg = CONFIG[type]
  const Icon = cfg.icon

  useEffect(() => {
    // Double RAF: first frame mounts the element at opacity-0, second triggers the transition
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    return () => cancelAnimationFrame(r)
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(() => removeToast(id), 200)
  }

  return (
    <div
      role="alert"
      onClick={dismiss}
      style={{
        background:   cfg.bg,
        border:       `1px solid ${cfg.border}`,
        color:        cfg.color,
        borderRadius: 10,
        padding:      '10px 12px',
        display:      'flex',
        alignItems:   'flex-start',
        gap:          10,
        minWidth:     260,
        maxWidth:     360,
        boxShadow:    '0 4px 16px rgba(9,30,66,0.14)',
        cursor:       'pointer',
        userSelect:   'none',
        transition:   'opacity 0.2s, transform 0.2s',
        opacity:       visible ? 1 : 0,
        transform:     visible ? 'translateY(0)' : 'translateY(12px)',
      }}>
      <Icon style={{ color: cfg.iconColor, flexShrink: 0, marginTop: 1 }} size={16} />
      <span style={{ fontSize: 13, fontWeight: 500, flex: 1, lineHeight: 1.4 }}>{message}</span>
      <button
        onClick={(e) => { e.stopPropagation(); dismiss() }}
        style={{ color: cfg.iconColor, opacity: 0.6, flexShrink: 0, marginTop: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <X size={14} />
      </button>
    </div>
  )
}

export default function Toaster() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div
      style={{
        position:      'fixed',
        bottom:        24,
        right:         24,
        zIndex:        9999,
        display:       'flex',
        flexDirection: 'column',
        gap:           8,
        pointerEvents: toasts.length === 0 ? 'none' : 'auto',
      }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  )
}
