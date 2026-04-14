'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import {
  Users, Shield, User, UserPlus, Mail, X, CheckCircle,
  Loader2, Link2, Copy, Check,
} from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import type { ProjectMember, Profile } from '@/types'

type MemberRow = ProjectMember & { profile: Profile }

export default function TeamView() {
  const { project, user } = useStore()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)

  // Check if current user is a project admin
  const currentMember = members.find(m => m.user_id === user?.id)
  const isProjectAdmin = currentMember?.role === 'admin' || user?.role === 'admin'

  async function loadMembers() {
    if (!project?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true })
    setMembers((data ?? []) as MemberRow[])
    setLoading(false)
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
            {members.length} member{members.length !== 1 ? 's' : ''} in <span className="font-semibold">{project?.name}</span>
          </p>
        </div>
        {isProjectAdmin && (
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Invite people
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
        </div>
      ) : (
        <>
          {admins.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#5E6C84]">Project Admins</span>
                <span className="text-xs bg-[#FFFAE6] text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">{admins.length}</span>
              </div>
              <MemberList members={admins} currentUserId={user?.id} />
            </section>
          )}

          {regular.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-3.5 h-3.5 text-[#5E6C84]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#5E6C84]">Members</span>
                <span className="text-xs bg-[#F4F5F7] text-[#5E6C84] border border-[#DFE1E6] rounded-full px-2 py-0.5 font-semibold">{regular.length}</span>
              </div>
              <MemberList members={regular} currentUserId={user?.id} />
            </section>
          )}

          {members.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
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
          )}
        </>
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

function MemberList({ members, currentUserId }: { members: MemberRow[]; currentUserId?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#DFE1E6] divide-y divide-[#F4F5F7] overflow-hidden shadow-sm">
      {members.map(m => {
        const p = m.profile
        if (!p) return null
        return (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F8F9FC] transition-colors">
            <div className="flex-shrink-0">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.name} className="w-9 h-9 rounded-full object-cover border border-[#DFE1E6]" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: `hsl(${p.name.charCodeAt(0) * 10 % 360}, 65%, 45%)` }}>
                  {p.name[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#172B4D] truncate">{p.name}</span>
                {p.id === currentUserId && (
                  <span className="text-[10px] text-[#7A869A] flex-shrink-0">(you)</span>
                )}
              </div>
              <div className="text-xs text-[#7A869A]">
                Added {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
              </div>
            </div>
            <span className={clsx(
              'text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize flex-shrink-0',
              m.role === 'admin'
                ? 'bg-[#FFFAE6] text-amber-700 border-amber-200'
                : 'bg-[#F4F5F7] text-[#5E6C84] border-[#DFE1E6]'
            )}>
              {m.role}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function InvitePanel({ projectId, projectName, currentUserId, onClose }: {
  projectId: string
  projectName: string
  currentUserId?: string
  onClose: () => void
}) {
  const [tab, setTab]               = useState<'link' | 'email'>('link')
  const [inviteLink, setInviteLink] = useState('')
  const [linkRole, setLinkRole]     = useState<'member' | 'admin'>('member')
  const [copied, setCopied]         = useState(false)
  const [generating, setGenerating] = useState(false)

  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails]         = useState<string[]>([])
  const [emailRole, setEmailRole]   = useState<'member' | 'admin'>('member')
  const [sending, setSending]       = useState(false)
  const [sentCount, setSentCount]   = useState(0)
  const [done, setDone]             = useState(false)

  async function generateLink() {
    setGenerating(true)
    const res = await fetch('/api/invite/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, role: linkRole, created_by: currentUserId }),
    })
    if (res.ok) {
      const { url } = await res.json()
      setInviteLink(url)
    }
    setGenerating(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    let count = 0
    for (const email of emails) {
      try {
        const res = await fetch('/api/team/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role: emailRole, project_id: projectId, invited_by: currentUserId }),
        })
        if (res.ok) count++
      } catch { /* continue */ }
    }
    setSentCount(count)
    setSending(false)
    setDone(true)
  }

  return (
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

        {done ? (
          <div className="p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#E3FCEF] flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#36B37E]" />
            </div>
            <div>
              <p className="font-bold text-[#172B4D] mb-1">Invites sent!</p>
              <p className="text-sm text-[#5E6C84]">{sentCount} invitation{sentCount !== 1 ? 's' : ''} sent successfully.</p>
            </div>
            <button onClick={onClose} className="btn-primary">Done</button>
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
              {tab === 'link' && (
                <div className="space-y-4">
                  <p className="text-sm text-[#5E6C84] leading-relaxed">
                    Share this link with anyone you want to invite. They'll join this project when they sign in.
                  </p>

                  {/* Role selector */}
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
                        <button onClick={copyLink}
                          className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all flex-shrink-0',
                            copied ? 'bg-[#E3FCEF] text-[#36B37E]' : 'bg-[#DEEBFF] text-[#0052CC] hover:bg-[#0052CC] hover:text-white')}>
                          {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                      </div>
                      <p className="text-xs text-[#7A869A]">Anyone with this link can join as <strong>{linkRole}</strong>. Link is valid for 7 days.</p>
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

              {tab === 'email' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Email addresses</label>
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-white border border-[#DFE1E6] rounded-lg px-2.5 focus-within:border-[#4C9AFF] focus-within:ring-2 focus-within:ring-[#4C9AFF]/20 transition-all">
                        <Mail className="w-3.5 h-3.5 text-[#B3BAC5]" />
                        <input type="text" value={emailInput}
                          onChange={e => setEmailInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(emailInput) } }}
                          placeholder="name@company.com" autoFocus
                          className="flex-1 py-2 text-sm bg-transparent outline-none text-[#172B4D] placeholder-[#B3BAC5]" />
                      </div>
                      <button onClick={() => addEmail(emailInput)} className="btn-primary flex-shrink-0">Add</button>
                    </div>
                    {emails.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {emails.map(email => (
                          <span key={email} className="flex items-center gap-1 bg-[#DEEBFF] text-[#0052CC] text-xs font-medium px-2 py-1 rounded-lg">
                            {email}
                            <button onClick={() => setEmails(prev => prev.filter(x => x !== email))}
                              className="hover:text-[#DE350B] transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
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
                      {sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</> : `Send ${emails.length > 0 ? emails.length : ''} invite${emails.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
