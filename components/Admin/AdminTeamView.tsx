'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import {
  Users, Upload, X, Mail, Shield, User,
  CheckCircle, ChevronRight, Plus, ArrowLeft, Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import type { TeamInvite } from '@/types'
import * as XLSX from 'xlsx'
import { formatDistanceToNow } from 'date-fns'

type Step = 'list' | 'invite' | 'roles' | 'sending' | 'done'

export default function AdminTeamView() {
  const { profiles, setProfiles } = useStore()

  const [step, setStep]               = useState<Step>('list')
  const [emailInput, setEmailInput]   = useState('')
  const [emails, setEmails]           = useState<string[]>([])
  const [invites, setInvites]         = useState<TeamInvite[]>([])
  const [dragOver, setDragOver]       = useState(false)
  const [sending, setSending]         = useState(false)
  const [sentCount, setSentCount]     = useState(0)
  const [rolePopupIdx, setRolePopupIdx] = useState(0)
  const [errors, setErrors]           = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: true })
      .then(({ data }) => data && setProfiles(data))
  }, [])

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

  function proceedToRoles() {
    if (!emails.length) return
    setInvites(emails.map(email => ({ email, role: 'member' })))
    setRolePopupIdx(0)
    setStep('roles')
  }

  function assignRole(role: 'admin' | 'member') {
    const updated = invites.map((inv, i) => i === rolePopupIdx ? { ...inv, role } : inv)
    setInvites(updated)
    const next = rolePopupIdx + 1
    if (next < invites.length) {
      setRolePopupIdx(next)
    } else {
      setStep('sending')
      sendAllInvites(updated)
    }
  }

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
      } catch { /* continue */ }
    }
    setSending(false)
    setStep('done')
  }

  async function handleRoleChange(profileId: string, newRole: 'admin' | 'member') {
    await supabase.from('profiles').update({ role: newRole }).eq('id', profileId)
    const { data } = await supabase.from('profiles').select('*')
    if (data) setProfiles(data)
  }

  const admins  = profiles.filter(p => p.role === 'admin')
  const members = profiles.filter(p => p.role === 'member')

  /* ── RENDER ── */
  return (
    <div className="p-6 max-w-4xl">

      {/* ── STEP: list ── */}
      {step === 'list' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#172B4D]">Team</h1>
              <p className="text-sm text-[#5E6C84] mt-0.5">
                {profiles.length} member{profiles.length !== 1 ? 's' : ''} across all projects
              </p>
            </div>
            <button onClick={() => setStep('invite')} className="btn-primary">
              <Plus className="w-4 h-4" /> Invite people
            </button>
          </div>

          {/* Admins section */}
          {admins.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">Admins</span>
                <span className="ml-1 text-xs bg-[#FFFAE6] text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">{admins.length}</span>
              </div>
              <MemberTable profiles={admins} onRoleChange={handleRoleChange} />
            </section>
          )}

          {/* Members section */}
          {members.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <Users className="w-3.5 h-3.5 text-[#5E6C84]" />
                <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">Members</span>
                <span className="ml-1 text-xs bg-[#F4F5F7] text-[#5E6C84] border border-[#DFE1E6] rounded-full px-2 py-0.5 font-medium">{members.length}</span>
              </div>
              <MemberTable profiles={members} onRoleChange={handleRoleChange} />
            </section>
          )}

          {profiles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-[#F4F5F7] rounded-full flex items-center justify-center mb-3">
                <Users className="w-7 h-7 text-[#B3BAC5]" />
              </div>
              <p className="text-sm font-medium text-[#172B4D] mb-1">No team members yet</p>
              <p className="text-sm text-[#7A869A] mb-4">Invite people to collaborate on your projects.</p>
              <button onClick={() => setStep('invite')} className="btn-primary">
                <Plus className="w-4 h-4" /> Invite people
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: invite ── */}
      {step === 'invite' && (
        <div className="max-w-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#DFE1E6]">
            <button onClick={() => { setStep('list'); setEmails([]) }}
              className="flex items-center gap-1 text-[#0052CC] text-xs hover:underline">
              <ArrowLeft className="w-3 h-3" /> Back to team
            </button>
            <span className="text-xs text-[#B3BAC5]">/</span>
            <span className="text-xs font-semibold text-[#172B4D]">Invite people</span>
          </div>

          {/* Drag & drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors',
              dragOver ? 'border-[#4C9AFF] bg-[#DEEBFF]' : 'border-[#DFE1E6] bg-[#F4F5F7] hover:border-[#4C9AFF] hover:bg-[#DEEBFF]/30'
            )}
          >
            <Upload className="w-6 h-6 text-[#B3BAC5] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#5E6C84]">Drop an Excel / CSV file here</p>
            <p className="text-xs text-[#7A869A] mt-1">or click to browse — emails extracted automatically</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0]) }} />
          </div>

          {/* Manual email input */}
          <div>
            <label className="block text-xs font-semibold text-[#5E6C84] mb-1">Email addresses</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white border border-[#DFE1E6] rounded px-2.5 focus-within:border-[#4C9AFF] focus-within:ring-2 focus-within:ring-[#4C9AFF]/30 transition-all">
                <Mail className="w-3.5 h-3.5 text-[#B3BAC5] flex-shrink-0" />
                <input type="text" value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(emailInput) } }}
                  placeholder="name@company.com, separate with comma or Enter"
                  className="flex-1 py-2 text-sm bg-transparent outline-none text-[#172B4D] placeholder-[#B3BAC5]"
                />
              </div>
              <button onClick={() => addEmail(emailInput)} className="btn-primary">Add</button>
            </div>
          </div>

          {/* Email chips */}
          {emails.length > 0 && (
            <div className="bg-white border border-[#DFE1E6] rounded p-3">
              <p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide mb-2">
                {emails.length} {emails.length === 1 ? 'person' : 'people'} to invite
              </p>
              <div className="flex flex-wrap gap-1.5">
                {emails.map(email => (
                  <span key={email} className="flex items-center gap-1 bg-[#DEEBFF] text-[#0052CC] text-xs font-medium px-2 py-1 rounded-sm">
                    {email}
                    <button onClick={() => removeEmail(email)} className="hover:text-[#DE350B] transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {errors.map((err, i) => <p key={i} className="text-xs text-[#DE350B]">{err}</p>)}

          <div className="flex gap-2 pt-1">
            <button onClick={() => { setStep('list'); setEmails([]) }}
              className="px-4 py-2 text-sm font-medium text-[#5E6C84] border border-[#DFE1E6] rounded hover:bg-[#F4F5F7] transition-colors">
              Cancel
            </button>
            <button disabled={emails.length === 0} onClick={proceedToRoles}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              Assign roles & send invites <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: roles ── */}
      {step === 'roles' && invites[rolePopupIdx] && (
        <div className="max-w-sm mx-auto mt-8">
          <div className="bg-white rounded border border-[#DFE1E6] p-6 text-center" style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.12)' }}>
            <div className="flex items-center justify-center gap-1 mb-5">
              {invites.map((_, i) => (
                <div key={i} className={clsx(
                  'h-1 rounded-full transition-all',
                  i < rolePopupIdx    ? 'bg-[#36B37E] w-5'
                  : i === rolePopupIdx ? 'bg-[#0052CC] w-7'
                  : 'bg-[#DFE1E6] w-5'
                )} />
              ))}
            </div>
            <div className="w-12 h-12 rounded-full bg-[#0052CC] flex items-center justify-center text-white text-lg font-bold mx-auto mb-3">
              {invites[rolePopupIdx].email[0].toUpperCase()}
            </div>
            <p className="text-xs text-[#7A869A] mb-0.5">{rolePopupIdx + 1} of {invites.length}</p>
            <h2 className="text-base font-semibold text-[#172B4D] mb-1 break-all">{invites[rolePopupIdx].email}</h2>
            <p className="text-sm text-[#5E6C84] mb-5">What role should this person have?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => assignRole('member')}
                className={clsx('flex flex-col items-center gap-2 p-4 rounded border-2 transition-colors',
                  invites[rolePopupIdx].role === 'member' ? 'border-[#0052CC] bg-[#DEEBFF]' : 'border-[#DFE1E6] bg-[#F4F5F7] hover:border-[#4C9AFF]')}>
                <User className="w-5 h-5 text-[#0052CC]" />
                <span className="text-sm font-semibold text-[#172B4D]">Member</span>
                <span className="text-[10px] text-[#7A869A] leading-tight text-center">Can view & edit tasks</span>
              </button>
              <button onClick={() => assignRole('admin')}
                className={clsx('flex flex-col items-center gap-2 p-4 rounded border-2 transition-colors',
                  invites[rolePopupIdx].role === 'admin' ? 'border-[#FF8B00] bg-[#FFFAE6]' : 'border-[#DFE1E6] bg-[#F4F5F7] hover:border-[#FF8B00]')}>
                <Shield className="w-5 h-5 text-[#FF8B00]" />
                <span className="text-sm font-semibold text-[#172B4D]">Admin</span>
                <span className="text-[10px] text-[#7A869A] leading-tight text-center">Full access & invite others</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP: sending ── */}
      {step === 'sending' && (
        <div className="flex flex-col items-center justify-center min-h-[320px] gap-4">
          <Loader2 className="w-9 h-9 animate-spin text-[#0052CC]" />
          <p className="text-sm font-medium text-[#172B4D]">Sending invites…</p>
          <p className="text-xs text-[#7A869A]">{sentCount} of {invites.length} sent</p>
        </div>
      )}

      {/* ── STEP: done ── */}
      {step === 'done' && (
        <div className="flex flex-col items-center justify-center min-h-[320px] gap-4">
          <div className="w-12 h-12 rounded-full bg-[#E3FCEF] flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-[#36B37E]" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-semibold text-[#172B4D] mb-1">Invites sent</h2>
            <p className="text-sm text-[#5E6C84]">
              {sentCount} invitation{sentCount !== 1 ? 's' : ''} sent successfully.
              <br />Team members will receive an email to create their account.
            </p>
          </div>
          <button onClick={() => { setStep('list'); setEmails([]); setSentCount(0) }} className="btn-primary">
            Back to team
          </button>
        </div>
      )}
    </div>
  )
}

// ── Reusable member table ────────────────────────────────────────────
function MemberTable({ profiles, onRoleChange }: {
  profiles: { id: string; name: string; avatar_url?: string; role: string; created_at: string }[]
  onRoleChange: (id: string, role: 'admin' | 'member') => void
}) {
  return (
    <div className="bg-white rounded-lg border border-[#DFE1E6] divide-y divide-[#F4F5F7]"
      style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.08)' }}>
      {profiles.map(p => (
        <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F4F5F7] transition-colors">
          <div className="relative flex-shrink-0">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={p.name} className="w-8 h-8 rounded-full object-cover border border-[#DFE1E6]" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#0052CC] flex items-center justify-center text-white text-xs font-bold">
                {p.name[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#172B4D] truncate">{p.name}</div>
            <div className="text-xs text-[#7A869A]">Joined {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</div>
          </div>
          <span className={clsx(
            'text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize flex-shrink-0',
            p.role === 'admin'
              ? 'bg-[#FFFAE6] text-amber-700 border-amber-200'
              : 'bg-[#F4F5F7] text-[#5E6C84] border-[#DFE1E6]'
          )}>
            {p.role}
          </span>
          <button
            onClick={() => onRoleChange(p.id, p.role === 'admin' ? 'member' : 'admin')}
            className="flex-shrink-0 text-xs font-medium text-[#0052CC] hover:bg-[#DEEBFF] px-2 py-1 rounded transition-colors"
            title={p.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
          >
            {p.role === 'admin' ? 'Make member' : 'Make admin'}
          </button>
        </div>
      ))}
    </div>
  )
}
