'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'

export default function LoadingBar() {
  const pendingOps = useStore((s) => s.pendingOps)
  const [width,   setWidth]   = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef    = useRef<number | null>(null)

  useEffect(() => {
    if (pendingOps > 0) {
      // Start: appear and animate to ~75%
      setVisible(true)
      setWidth(0)
      if (timerRef.current) clearTimeout(timerRef.current)
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setWidth(72))
      })
    } else if (visible) {
      // Finish: rush to 100%, then fade out
      setWidth(100)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 400)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [pendingOps])

  if (!visible) return null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, height: 3, pointerEvents: 'none' }}>
      <div style={{
        height:     '100%',
        width:      `${width}%`,
        background: 'linear-gradient(90deg, #0052CC, #4C9AFF)',
        transition: width === 100
          ? 'width 0.3s ease-in'
          : 'width 1.8s cubic-bezier(0.1, 0.4, 0.3, 1)',
        boxShadow:  '0 0 8px rgba(0,82,204,0.6)',
        opacity:    width === 100 && !visible ? 0 : 1,
      }} />
    </div>
  )
}
