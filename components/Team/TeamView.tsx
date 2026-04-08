'use client'

import { useState, useRef, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase/client'
import { Users, Upload, X, Mail, Shield, User, CheckCircle, ChevronRight, Plus } from 'lucide-react'
import clsx from 'clsx'
import type { TeamInvite } from '@/types'
import * as XLSX from 'xlsx'

type Step = 'list' | 'invite' | 'roles' | 'sending' | 'done'

export default function TeamView() {
  const { profiles, user, setActiveView } = useStore()

  const [step, setStep]           = useState<Step>('list')
  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails]       = useState<string[]>([])
  const [invites, setInvites]     = useState<TeamInvite[]>([])
  const [dragOver, setDragOver]   = useState(false)
  const [sending, setSending]     = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [rolePopupIdx, setRolePopupIdx] = useState(0)
  const [errors, setErrors]       = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  /* ── helpers ── */
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  function addEmail(raw: string) {
    const list = raw
      .split(/[\s,;]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => isValidEmail(s) && !emails.includes(s))
    setEmails(prev => [...prev, ...list])
    setEmailInput('')
  }

  function removeEmail(e: string) {
    setEmails(prev => prev.filter(x => x !== e))
  }

  function parseFile(file: File) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
        const found: string[] = []
        rows.forEach(row => {
          (row as unknown[]).forEach(cell => {
            const val = String(cell ?? '').trim().toLowerCase()
            if (isValidEmail(val) && !emails.includes(val)) found.push(val)
          })
        })
        if (found.length) setEmails(prev => Array.from(new Set([...prev, ...found])))
      } catch {
        setErrors(prev => [...prev, 'Could not parse file. Please use .xlsx or .csv'])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [emails])

  /* ── step: invite → build role list ── */
  function proceedToRoles() {
    if (!emails.length) return
    const list: TeamInvite[] = emails.map(email => ({ email, role: 'member' }))
    setInvites(list)
    setRolePopupIdx(0)
    setStep('roles')
  }

  /* ── role popup: set role for current person ── */
  function assignRole(role: 'admin' | 'member') {
    const updated = invites.map((inv, i) =>
      i === rolePopupIdx ? { ...inv, role } : inv
    )
    setInvites(updated)
    const next = rolePopupIdx + 1
    if (next < invites.length) {
      setRolePopupIdx(next)
    } else {
      setStep('sending')
      sendAllInvites(updated)
    }
  }

  /* ── send invites via API route ── */
  async function sendAllInvites(list: TeamInvite[]) {
    setSending(true)
    let count = 0
    for (const inv of list) {
      try {
        await fetch('/api/team/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inv.email, role: inv.role }),
        })
        count++
        setSentCount(count)
      } catch {
        // continue
      }
    }
    setSending(false)
    setStep('done')
  }

  /* ── after done → dashboard ── */
  function goToDashboard() {
    setActiveView('dashboard')
  }

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
            <Users className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Team</h1>
            <p className="text-xs text-gray-400">{profiles.length} member{profiles.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {step === 'list' && user?.role === 'admin' && (
          <button
            onClick={() => setStep('invite')}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold rounded-xl transition-colors shadow"
          >
            <Plus className="w-4 h-4" />
            Invite Members
          </button>
        )}
      </div>

      {/* ── STEP: list ── */}
      {step === 'list' && (
        <div className="space-y-2">
          {profiles.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              No team members yet. Invite people to get started.
            </div>
          )}
          {profiles.map(p => (
            <div key={p.id}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow transition-shadow">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.name}
                  className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-black">
                  {p.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">{p.name}</div>
                <div className="text-xs text-gray-400 capitalize">{p.role}</div>
              </div>
              <span className={clsx(
                'text-[11px] font-bold px-2.5 py-1 rounded-full',
                p.role === 'admin'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500'
              )}>
                {p.role === 'admin' ? 'Admin' : 'Member'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── STEP: invite (add emails) ── */}
      {step === 'invite' && (
        <div className="space-y-6">
          {/* Drag & drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
              dragOver
                ? 'border-cyan-400 bg-cyan-50'
                : 'border-gray-200 bg-gray-50 hover:border-cyan-300 hover:bg-cyan-50/30'
            )}
          >
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">Drop an Excel / CSV file here</p>
            <p className="text-xs text-gray-400 mt-1">or click to browse — emails will be extracted automatically</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0]) }}
            />
          </div>

          {/* Manual email input */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 shadow-sm">
              <Mail className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <input
                type="text"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(emailInput) } }}
                placeholder="Add email address..."
                className="flex-1 py-3 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-300"
              />
            </div>
            <button
              onClick={() => addEmail(emailInput)}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Add
            </button>
          </div>

          {/* Email chips */}
          {emails.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {emails.length} email{emails.length !== 1 ? 's' : ''} to invite
              </p>
              <div className="flex flex-wrap gap-2">
                {emails.map(email => (
                  <span key={email}
                    className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
                    {email}
                    <button onClick={() => removeEmail(email)} className="hover:text-rose-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {errors.map((err, i) => (
            <p key={i} className="text-xs text-rose-500">{err}</p>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setStep('list'); setEmails([]) }}
              className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={emails.length === 0}
              onClick={proceedToRoles}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow"
            >
              Assign Roles & Send Invites
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: roles (popup per person) ── */}
      {step === 'roles' && invites[rolePopupIdx] && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 text-center">
            {/* Progress */}
            <div className="flex items-center justify-center gap-1 mb-6">
              {invites.map((_, i) => (
                <div key={i} className={clsx(
                  'h-1.5 rounded-full transition-all',
                  i < rolePopupIdx ? 'bg-cyan-400 w-6'
                  : i === rolePopupIdx ? 'bg-cyan-500 w-8'
                  : 'bg-gray-200 w-6'
                )} />
              ))}
            </div>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xl font-black mx-auto mb-4 shadow-lg">
              {invites[rolePopupIdx].email[0].toUpperCase()}
            </div>

            <p className="text-xs text-gray-400 mb-1">
              {rolePopupIdx + 1} of {invites.length}
            </p>
            <h2 className="text-base font-bold text-gray-900 mb-1 break-all">
              {invites[rolePopupIdx].email}
            </h2>
            <p className="text-sm text-gray-500 mb-8">What role should this person have?</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => assignRole('member')}
                className={clsx(
                  'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:border-violet-400 hover:bg-violet-50',
                  invites[rolePopupIdx].role === 'member'
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-100 bg-gray-50'
                )}
              >
                <User className="w-6 h-6 text-violet-500" />
                <span className="text-sm font-bold text-gray-800">Member</span>
                <span className="text-[10px] text-gray-400 leading-tight text-center">Can view & edit tasks</span>
              </button>
              <button
                onClick={() => assignRole('admin')}
                className={clsx(
                  'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:border-amber-400 hover:bg-amber-50',
                  invites[rolePopupIdx].role === 'admin'
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-gray-100 bg-gray-50'
                )}
              >
                <Shield className="w-6 h-6 text-amber-500" />
                <span className="text-sm font-bold text-gray-800">Admin</span>
                <span className="text-[10px] text-gray-400 leading-tight text-center">Full access & invite others</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP: sending ── */}
      {step === 'sending' && (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-gray-700">Sending invites…</p>
          <p className="text-xs text-gray-400">{sentCount} of {invites.length} sent</p>
        </div>
      )}

      {/* ── STEP: done ── */}
      {step === 'done' && (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Invites Sent!</h2>
            <p className="text-sm text-gray-500">
              {sentCount} invitation{sentCount !== 1 ? 's' : ''} sent successfully.
              <br />Team members will receive an email to create their account.
            </p>
          </div>
          <button
            onClick={goToDashboard}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold rounded-xl transition-colors shadow"
          >
            Go to Dashboard
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
