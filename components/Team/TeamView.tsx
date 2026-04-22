'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import {
  Users, Shield, User, UserPlus, Mail, X, CheckCircle,
  Loader2, Link2, Copy, Check, Zap, RefreshCw,
  Activity, Clock, CheckCheck,
} from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import type { ProjectMember, Profile } from '@/types'

type MemberRow = ProjectMember & {
  profile:    Profile
  taskCount:  number
  lastActive: string | null
  isActive:   boolean
}

type PendingInvite = {
  id:          string
  token:       string
  role:        string
  created_at:  string
  uses:        number
  expires_at?: string | null
}

// ── Clipboard helper with execCommand fallback ────────────────────
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
      document.body.appendChild(el)
      el.focus()
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}

export default function TeamView() {
  const { project, user, addToast } = useStore()
  const [members, setMembers]             = useState<MemberRow[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading]             = useState(true)
  const [showInvite, setShowInvite]       = useState(false)
  const [quickLink, setQuickLink]         = useState('')
  const [generating, setGenerating]       = useState(false)
  const [copied, setCopied]               = useState(false)

  const currentMember  = members.find(m => m.user_id === user?.id)
  const isProjectAdmin = currentMember?.role === 'admin'
    || user?.role === 'admin'
    || project?.created_by === user?.id

  async function loadMembers() {
    if (!project?.id) {
      setMembers([])
      setPendingInvites([])
      setLoading(false)
      return
    }
    setLoading(true)

    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: memberData }, { data: taskData }, { data: activityData }, { data: tokenData }] =
      await Promise.all([
        // Use RPC to bypass pm_select restriction (pm_select only returns own row to prevent recursion)
        supabase.rpc('get_project_members', { p_project_id: project.id }),
        supabase
          .from('bugs')
          .select('assignee_id')
          .eq('project_id', project.id)
          .not('assignee_id', 'is', null),
        supabase
          .from('activity_logs')
          .select('user_id, created_at')
          .gte('created_at', cutoff),
        supabase
          .from('invite_tokens')
          .select('id, token, role, created_at, uses, expires_at')
          .eq('project_id', project.id)
          .eq('uses', 0),
      ])

    // task count per user
    const taskCount: Record<string, number> = {}
    for (const t of taskData ?? []) {
      if (t.assignee_id) taskCount[t.assignee_id] = (taskCount[t.assignee_id] ?? 0) + 1
    }

    // last active per user
    const lastActive: Record<string, string> = {}
    for (const a of activityData ?? []) {
      if (!lastActive[a.user_id] || a.created_at > lastActive[a.user_id])
        lastActive[a.user_id] = a.created_at
    }

    const rows: MemberRow[] = (memberData ?? []).map((m: any) => ({
      ...m,
      taskCount:  taskCount[m.user_id]  ?? 0,
      lastActive: lastActive[m.user_id] ?? null,
      isActive:   !!lastActive[m.user_id],
    }))

    setMembers(rows)
    setPendingInvites(
      (tokenData ?? [])
        .filter(t => !t.expires_at || new Date(t.expires_at) > new Date())
        .map(t => ({ ...t }))
    )
    setLoading(false)
  }

  async function generateQuickLink() {
    if (!project?.id) return
    setGenerating(true)
    const res = await fetch('/api/invite/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: project.id,
        role: 'member',
        created_by: user?.id,
        origin: window.location.origin,
      }),
    })
    if (res.ok) {
      const { url } = await res.json()
      setQuickLink(url)
      addToast('success', 'Invite link generated.')
    } else {
      addToast('error', 'Failed to generate invite link.')
    }
    setGenerating(false)
  }

  async function copyQuickLink() {
    const ok = await copyToClipboard(quickLink)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  useEffect(() => { loadMembers() }, [project?.id])

  const admins  = members.filter(m => m.role === 'admin')
  const regular = members.filter(m => m.role !== 'admin')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#172B4D]">People</h1>
          <p className="text-sm text-[#5E6C84] mt-0.5">
            Members of <span className="font-semibold">{project?.name}</span>
          </p>
        </div>
        {isProjectAdmin && (
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Invite people
          </button>
        )}
      </div>

      {/* Stats summary — always show once loaded */}
      {!loading && project && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: members.length,                       icon: <Users className="w-4 h-4" />,    bg: '#DEEBFF', color: '#0052CC' },
            { label: 'Active',   value: members.filter(m => m.isActive).length,  icon: <Activity className="w-4 h-4" />, bg: '#E3FCEF', color: '#36B37E' },
            { label: 'Inactive', value: members.filter(m => !m.isActive).length, icon: <Clock className="w-4 h-4" />,   bg: '#F4F5F7', color: '#7A869A' },
            { label: 'Pending invites', value: pendingInvites.length,         icon: <Mail className="w-4 h-4" />,     bg: '#FFFAE6', color: '#FF8B00' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-[#DFE1E6] rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.06)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: '#172B4D' }}>{s.value}</p>
                <p className="text-xs" style={{ color: '#7A869A' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick invite link bar — admins only */}
      {isProjectAdmin && (
        <div className="bg-white border border-[#DFE1E6] rounded-xl px-4 py-3.5 flex items-center gap-3"
          style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.08)' }}>
          <div className="w-8 h-8 rounded-lg bg-[#DEEBFF] flex items-center justify-center flex-shrink-0">
            <Link2 className="w-4 h-4 text-[#0052CC]" />
          </div>
          <div className="flex-1 min-w-0">
            {quickLink ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#44546F] truncate flex-1">{quickLink}</span>
                <button onClick={copyQuickLink}
                  className={clsx(
                    'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 transition-all',
                    copied ? 'bg-[#E3FCEF] text-[#36B37E]' : 'bg-[#DEEBFF] text-[#0052CC] hover:bg-[#0052CC] hover:text-white'
                  )}>
                  {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
                <button onClick={() => { setQuickLink(''); generateQuickLink() }} title="New link"
                  className="p-1 rounded text-[#7A869A] hover:text-[#0052CC] hover:bg-[#DEEBFF] transition-colors flex-shrink-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#172B4D]">Invite link</p>
                  <p className="text-xs text-[#7A869A]">Generate a link to share with people you want to add as members</p>
                </div>
                <button onClick={generateQuickLink} disabled={generating}
                  className="btn-primary flex-shrink-0 text-xs py-1.5">
                  {generating
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                    : <><Link2 className="w-3.5 h-3.5" /> Get link</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!project && !loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[#F4F5F7] rounded-2xl flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-[#B3BAC5]" />
          </div>
          <p className="text-sm font-semibold text-[#172B4D] mb-1">No project selected</p>
          <p className="text-sm text-[#7A869A]">Select or create a project first to manage its members.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
        </div>
      ) : members.length === 0 && pendingInvites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-[#F4F5F7] rounded-2xl flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-[#B3BAC5]" />
          </div>
          <p className="text-sm font-semibold text-[#172B4D] mb-1">No team members yet</p>
          <p className="text-sm text-[#7A869A] mb-4">Invite people to collaborate on this project.</p>
          {isProjectAdmin && (
            <button onClick={() => setShowInvite(true)} className="btn-primary">
              <UserPlus className="w-4 h-4" /> Invite people
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Accepted members table ── */}
          {members.length > 0 && <div className="bg-white rounded-xl border border-[#DFE1E6] overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.08)' }}>
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 bg-[#F8F9FC] border-b border-[#DFE1E6]">
              <span className="w-9" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A869A]">Name</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A869A]">Role</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A869A]">Status</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A869A]">Tasks</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A869A]">Joined</span>
            </div>

            {members.map(m => {
              const p = m.profile
              if (!p) return null
              return (
                <div key={m.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-[#F4F5F7] last:border-0 hover:bg-[#FAFBFC] transition-colors">
                  {/* Avatar */}
                  <div className="w-9 h-9 flex-shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.name} className="w-9 h-9 rounded-full object-cover border border-[#DFE1E6]" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: `hsl(${p.name.charCodeAt(0) * 10 % 360}, 65%, 45%)` }}>
                        {p.name[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#172B4D] truncate">{p.name}</span>
                      {p.id === user?.id && <span className="text-[10px] text-[#7A869A]">(you)</span>}
                    </div>
                    {m.lastActive && (
                      <p className="text-[11px] text-[#97A0AF]">
                        Last active {formatDistanceToNow(new Date(m.lastActive), { addSuffix: true })}
                      </p>
                    )}
                  </div>

                  {/* Role */}
                  <span className={clsx(
                    'text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize flex-shrink-0',
                    m.role === 'admin' ? 'bg-[#FFFAE6] text-amber-700 border-amber-200' : 'bg-[#F4F5F7] text-[#5E6C84] border-[#DFE1E6]'
                  )}>
                    {m.role === 'admin' ? '⭐ Admin' : 'Member'}
                  </span>

                  {/* Active status */}
                  <span className={clsx(
                    'flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0',
                    m.isActive
                      ? 'bg-[#E3FCEF] text-[#006644] border-[#ABF5D1]'
                      : 'bg-[#F4F5F7] text-[#97A0AF] border-[#DFE1E6]'
                  )}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', m.isActive ? 'bg-[#36B37E]' : 'bg-[#C1C7D0]')} />
                    {m.isActive ? 'Active' : 'Inactive'}
                  </span>

                  {/* Tasks assigned */}
                  <span className="text-[11px] font-semibold text-[#172B4D] flex-shrink-0 text-center">
                    {m.taskCount > 0
                      ? <span className="bg-[#DEEBFF] text-[#0052CC] px-2 py-0.5 rounded-full">{m.taskCount} task{m.taskCount !== 1 ? 's' : ''}</span>
                      : <span className="text-[#C1C7D0]">—</span>
                    }
                  </span>

                  {/* Joined */}
                  <span className="text-xs text-[#97A0AF] flex-shrink-0 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <CheckCheck className="w-3 h-3 text-[#36B37E]" />
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>}

          {/* ── Pending invites ── */}
          {pendingInvites.length > 0 && (
            <div className="bg-white rounded-xl border border-[#DFE1E6] overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.08)' }}>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FFFAE6] border-b border-[#FFE380]">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Pending Invites ({pendingInvites.length})
                </span>
              </div>
              {pendingInvites.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#F4F5F7] last:border-0">
                  <div className="w-9 h-9 rounded-full bg-[#FFFAE6] flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#172B4D]">Invite link</p>
                    <p className="text-xs text-[#7A869A]">
                      Created {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                      {inv.expires_at && ` · expires ${formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}`}
                    </p>
                  </div>
                  <span className={clsx(
                    'text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize flex-shrink-0',
                    inv.role === 'admin' ? 'bg-[#FFFAE6] text-amber-700 border-amber-200' : 'bg-[#F4F5F7] text-[#5E6C84] border-[#DFE1E6]'
                  )}>
                    {inv.role}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#FFFAE6] text-amber-700 border border-amber-200 flex-shrink-0">
                    <Clock className="w-3 h-3" /> Not accepted
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showInvite && project && (
        <InvitePanel
          projectId={project.id}
          projectName={project.name}
          currentUserId={user?.id}
          onClose={() => { setShowInvite(false); loadMembers() }}
        />
      )}
    </div>
  )
}


function InvitePanel({ projectId, projectName, currentUserId, onClose }: {
  projectId: string
  projectName: string
  currentUserId?: string
  onClose: () => void
}) {
  const { addToast } = useStore()
  const [tab, setTab]               = useState<'link' | 'email'>('link')

  // Link tab
  const [inviteLink, setInviteLink] = useState('')
  const [linkRole, setLinkRole]     = useState<'member' | 'admin'>('member')
  const [linkCopied, setLinkCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Email tab
  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails]         = useState<string[]>([])
  const [emailRole, setEmailRole]   = useState<'member' | 'admin'>('member')
  const [sending, setSending]       = useState(false)
  const [results, setResults]       = useState<{ email: string; inviteUrl: string; emailSent: boolean }[]>([])
  const [copiedUrl, setCopiedUrl]   = useState('')

  async function generateLink() {
    setGenerating(true)
    setInviteLink('')
    const res = await fetch('/api/invite/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        role: linkRole,
        created_by: currentUserId,
        origin: window.location.origin,
      }),
    })
    if (res.ok) {
      const { url } = await res.json()
      setInviteLink(url)
      addToast('success', 'Invite link generated.')
    } else {
      addToast('error', 'Failed to generate invite link.')
    }
    setGenerating(false)
  }

  async function copyLink(url: string, key: string) {
    const ok = await copyToClipboard(url)
    if (!ok) return
    setCopiedUrl(key)
    setTimeout(() => setCopiedUrl(''), 2000)
  }

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  function addEmail(raw: string) {
    const list = raw.split(/[\s,;]+/).map(s => s.trim().toLowerCase())
      .filter(s => isValidEmail(s) && !emails.includes(s))
    setEmails(prev => [...prev, ...list])
    setEmailInput('')
  }

  async function handleSend() {
    if (!emails.length) return
    setSending(true)
    const out: typeof results = []
    for (const email of emails) {
      try {
        const res = await fetch('/api/team/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            role: emailRole,
            project_id: projectId,
            invited_by: currentUserId,
            origin: window.location.origin,
          }),
        })
        if (res.ok) {
          const body = await res.json()
          out.push({ email, inviteUrl: body.inviteUrl ?? '', emailSent: body.emailSent ?? false })
        } else {
          out.push({ email, inviteUrl: '', emailSent: false })
        }
      } catch {
        out.push({ email, inviteUrl: '', emailSent: false })
      }
    }
    setResults(out)
    setSending(false)
    const sent = out.filter(r => r.emailSent).length
    if (sent > 0) addToast('success', `${sent} invite${sent !== 1 ? 's' : ''} sent successfully.`)
    else if (out.some(r => r.inviteUrl)) addToast('info', 'Invites created — copy the links to share.')
    else addToast('error', 'Failed to send invites.')
  }

  const isDone = results.length > 0

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ border: '1px solid #DFE1E6' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DFE1E6]">
          <div>
            <h2 className="text-base font-bold text-[#172B4D]">Invite to {projectName}</h2>
            <p className="text-xs text-[#7A869A] mt-0.5">Only invited members can access this project</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7A869A] hover:bg-[#F4F5F7] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Email results screen ── */}
        {isDone ? (
          <div className="p-5 space-y-3 max-h-[420px] overflow-y-auto">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-[#36B37E]" />
              <p className="text-sm font-bold text-[#172B4D]">
                {results.filter(r => r.emailSent).length} of {results.length} email{results.length !== 1 ? 's' : ''} sent
              </p>
            </div>

            {results.map(r => (
              <div key={r.email} className="rounded-xl border border-[#DFE1E6] overflow-hidden">
                <div className={clsx(
                  'flex items-center gap-2 px-3 py-2',
                  r.emailSent ? 'bg-[#E3FCEF]' : 'bg-[#FFFAE6]'
                )}>
                  {r.emailSent
                    ? <CheckCircle className="w-3.5 h-3.5 text-[#36B37E] flex-shrink-0" />
                    : <Mail className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  <span className="text-xs font-semibold truncate flex-1"
                    style={{ color: r.emailSent ? '#006644' : '#974F0C' }}>
                    {r.email}
                  </span>
                  <span className="text-[10px] font-medium flex-shrink-0"
                    style={{ color: r.emailSent ? '#006644' : '#974F0C' }}>
                    {r.emailSent ? 'Email sent ✓' : 'Use link below'}
                  </span>
                </div>

                {/* Always show the invite link for manual sharing */}
                {r.inviteUrl && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white">
                    <Link2 className="w-3 h-3 text-[#7A869A] flex-shrink-0" />
                    <span className="text-[11px] text-[#44546F] font-mono flex-1 truncate">{r.inviteUrl}</span>
                    <button
                      onClick={() => copyLink(r.inviteUrl, r.email)}
                      className={clsx(
                        'flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg flex-shrink-0 transition-all',
                        copiedUrl === r.email ? 'bg-[#E3FCEF] text-[#36B37E]' : 'bg-[#DEEBFF] text-[#0052CC] hover:bg-[#0052CC] hover:text-white'
                      )}>
                      {copiedUrl === r.email ? <><Check className="w-2.5 h-2.5" /> Copied</> : <><Copy className="w-2.5 h-2.5" /> Copy</>}
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button onClick={onClose} className="w-full btn-primary justify-center mt-2">Done</button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-[#DFE1E6]">
              {(['link', 'email'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-all border-b-2',
                    tab === t ? 'border-[#0052CC] text-[#0052CC]' : 'border-transparent text-[#626F86] hover:text-[#172B4D]')}>
                  {t === 'link' ? <><Link2 className="w-3.5 h-3.5" /> Invite link</> : <><Mail className="w-3.5 h-3.5" /> Email invite</>}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* ── Link tab ── */}
              {tab === 'link' && (
                <div className="space-y-4">
                  <p className="text-sm text-[#5E6C84] leading-relaxed">
                    Share this link with anyone you want to invite. They'll join this project when they sign in.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-[#5E6C84] mb-2">Join as</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['member', 'admin'] as const).map(r => (
                        <button key={r} onClick={() => { setLinkRole(r); setInviteLink('') }}
                          className={clsx('flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all',
                            linkRole === r ? 'border-[#0052CC] bg-[#DEEBFF]' : 'border-[#DFE1E6] hover:border-[#B3BAC5]')}>
                          {r === 'admin'
                            ? <Shield className={clsx('w-4 h-4', linkRole === r ? 'text-[#0052CC]' : 'text-[#7A869A]')} />
                            : <User   className={clsx('w-4 h-4', linkRole === r ? 'text-[#0052CC]' : 'text-[#7A869A]')} />}
                          <span className="text-sm font-semibold text-[#172B4D] capitalize">{r}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {inviteLink ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-[#F4F5F7] rounded-xl px-3 py-2.5"
                        style={{ border: '1px solid #DFE1E6' }}>
                        <Link2 className="w-3.5 h-3.5 text-[#7A869A] flex-shrink-0" />
                        <span className="text-xs text-[#44546F] flex-1 truncate font-mono">{inviteLink}</span>
                        <button onClick={() => copyLink(inviteLink, 'link')}
                          className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all flex-shrink-0',
                            copiedUrl === 'link' ? 'bg-[#E3FCEF] text-[#36B37E]' : 'bg-[#DEEBFF] text-[#0052CC] hover:bg-[#0052CC] hover:text-white')}>
                          {copiedUrl === 'link' ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#7A869A]">
                          Anyone with this link joins as <strong>{linkRole}</strong>. Valid 7 days.
                        </p>
                        <button onClick={generateLink} disabled={generating}
                          className="text-xs text-[#0052CC] hover:underline font-medium flex-shrink-0 ml-2">
                          {generating ? 'Generating…' : 'New link'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={generateLink} disabled={generating}
                      className="w-full btn-primary justify-center py-2.5">
                      {generating
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                        : <><Link2 className="w-4 h-4" /> Generate invite link</>}
                    </button>
                  )}
                </div>
              )}

              {/* ── Email tab ── */}
              {tab === 'email' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#5E6C84]">Email addresses</label>
                      <button
                        type="button"
                        onClick={() => {
                          const rand = Math.random().toString(36).slice(2, 8)
                          setEmailInput(`testmember-${rand}@mailinator.com`)
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#6554C0] hover:bg-[#EAE6FF] px-2 py-0.5 rounded transition-colors">
                        <Zap className="w-3 h-3" />
                        Quick test (Mailinator)
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-white border border-[#DFE1E6] rounded-lg px-2.5 focus-within:border-[#4C9AFF] focus-within:ring-2 focus-within:ring-[#4C9AFF]/20 transition-all">
                        <Mail className="w-3.5 h-3.5 text-[#B3BAC5]" />
                        <input type="text" value={emailInput}
                          onChange={e => setEmailInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(emailInput) } }}
                          placeholder="name@mailinator.com or any email" autoFocus
                          className="flex-1 py-2 text-sm bg-transparent outline-none text-[#172B4D] placeholder-[#B3BAC5]" />
                      </div>
                      <button onClick={() => addEmail(emailInput)} className="btn-primary flex-shrink-0">Add</button>
                    </div>
                    {emails.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {emails.map(e => (
                          <span key={e} className="flex items-center gap-1 bg-[#DEEBFF] text-[#0052CC] text-xs font-medium px-2 py-1 rounded-lg">
                            {e.includes('mailinator') && <Zap className="w-2.5 h-2.5 text-[#6554C0]" />}
                            {e}
                            <button onClick={() => setEmails(prev => prev.filter(x => x !== e))}
                              className="hover:text-[#DE350B] transition-colors ml-0.5">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-[#97A0AF] mt-1.5">
                      Each person gets a personal invite email + a backup link you can copy.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5E6C84] mb-2">Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['member', 'admin'] as const).map(r => (
                        <button key={r} onClick={() => setEmailRole(r)}
                          className={clsx('flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all',
                            emailRole === r ? 'border-[#0052CC] bg-[#DEEBFF]' : 'border-[#DFE1E6] hover:border-[#B3BAC5]')}>
                          {r === 'admin'
                            ? <Shield className={clsx('w-4 h-4', emailRole === r ? 'text-[#0052CC]' : 'text-[#7A869A]')} />
                            : <User   className={clsx('w-4 h-4', emailRole === r ? 'text-[#0052CC]' : 'text-[#7A869A]')} />}
                          <div>
                            <div className="text-sm font-semibold text-[#172B4D] capitalize">{r}</div>
                            <div className="text-[10px] text-[#7A869A]">{r === 'admin' ? 'Can manage project' : 'Can view & create'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 btn-secondary justify-center">Cancel</button>
                    <button onClick={handleSend} disabled={emails.length === 0 || sending}
                      className="flex-1 btn-primary justify-center disabled:opacity-40 disabled:cursor-not-allowed">
                      {sending
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                        : `Send ${emails.length > 0 ? emails.length : ''} invite${emails.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
