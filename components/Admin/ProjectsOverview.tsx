'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import type { Project, Profile, ProjectMember } from '@/types'
import Modal from '@/components/ui/Modal'
import {
  Bug, Sparkles, Users, Plus, ArrowRight, Loader2, FolderKanban,
  X, Mail, Shield, User, CheckCircle, ChevronRight, Trash2,
  MoreHorizontal, UserPlus, Settings2,
} from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

const AVATAR_COLORS = [
  '#0052CC', '#6554C0', '#00B8D9', '#36B37E',
  '#FF5630', '#FF991F', '#172B4D', '#403294',
]

function toKey(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9\s]/g,'').trim()
    .split(/\s+/).map(w => w[0]).join('').slice(0,4) || 'PROJ'
}

// ── Create Project Modal ─────────────────────────────────────────────
function CreateProjectModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (p: Project) => void
}) {
  const { user } = useStore()
  const [name, setName]               = useState('')
  const [key, setKey]                 = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor]             = useState(AVATAR_COLORS[0])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  function handleNameChange(v: string) { setName(v); setKey(toKey(v)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !user) return
    setSaving(true); setError('')
    const { data, error: err } = await supabase
      .from('projects')
      .insert({ name: name.trim(), key: key || toKey(name), description: description.trim() || null, avatar_color: color, created_by: user.id })
      .select().single()
    if (err) { setError(err.message); setSaving(false); return }

    // Auto-add the admin as project member
    await supabase.from('project_members').upsert(
      { project_id: data.id, user_id: user.id, role: 'admin', invited_by: user.id },
      { onConflict: 'project_id,user_id' }
    )

    onCreated(data as Project)
  }

  return (
    <Modal title="Create project" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: color }}>
            {key || 'P'}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#5E6C84] mb-1.5">Color</p>
            <div className="flex gap-1.5 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-5 h-5 rounded transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#5E6C84] mb-1">Name <span className="text-[#DE350B]">*</span></label>
          <input className="input" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Mobile App" required autoFocus />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#5E6C84] mb-1">Key <span className="text-[#DE350B]">*</span></label>
          <input className="input font-mono" value={key}
            onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} placeholder="PROJ" required />
          <p className="text-[11px] text-[#7A869A] mt-1">Used as prefix for issues (e.g. PROJ-1)</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#5E6C84] mb-1">Description <span className="text-[#7A869A] font-normal">(optional)</span></label>
          <textarea className="input resize-none h-16" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" />
        </div>
        {error && <p className="text-xs text-[#DE350B] bg-[#FFEBE6] px-3 py-2 rounded">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 btn-secondary justify-center">Cancel</button>
          <button type="submit" disabled={saving || !name.trim()} className="flex-1 btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Invite to Project Modal ──────────────────────────────────────────
function InviteToProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const { user } = useStore()
  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails]         = useState<string[]>([])
  const [role, setRole]             = useState<'member' | 'admin'>('member')
  const [sending, setSending]       = useState(false)
  const [sentCount, setSentCount]   = useState(0)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState('')

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
          body: JSON.stringify({ email, role, project_id: project.id, invited_by: user?.id }),
        })
        if (res.ok) { count++; setSentCount(count) }
      } catch { /* continue */ }
    }
    setSending(false)
    setDone(true)
  }

  if (done) {
    return (
      <Modal title={`Invite to ${project.name}`} onClose={onClose} size="sm">
        <div className="flex flex-col items-center py-6 gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#E3FCEF] flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-[#36B37E]" />
          </div>
          <div>
            <p className="font-semibold text-[#172B4D] mb-1">Invites sent</p>
            <p className="text-sm text-[#5E6C84]">
              {sentCount} invitation{sentCount !== 1 ? 's' : ''} sent.
              <br/>People will receive an email to join.
            </p>
          </div>
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`Invite people to ${project.name}`} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#F4F5F7] border border-[#DFE1E6]">
          <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: project.avatar_color }}>
            {project.key.slice(0,2)}
          </div>
          <div>
            <div className="text-sm font-semibold text-[#172B4D]">{project.name}</div>
            <div className="text-xs text-[#7A869A]">Inviting to this project only</div>
          </div>
        </div>

        {/* Email input */}
        <div>
          <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Email addresses</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white border border-[#DFE1E6] rounded-md px-2.5 focus-within:border-[#4C9AFF] focus-within:ring-2 focus-within:ring-[#4C9AFF]/20 transition-all">
              <Mail className="w-3.5 h-3.5 text-[#B3BAC5] flex-shrink-0" />
              <input type="email" value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(emailInput) } }}
                placeholder="name@company.com"
                className="flex-1 py-2 text-sm bg-transparent outline-none text-[#172B4D] placeholder-[#B3BAC5]"
              />
            </div>
            <button onClick={() => addEmail(emailInput)} className="btn-primary flex-shrink-0">Add</button>
          </div>
          <p className="text-[11px] text-[#7A869A] mt-1">Separate multiple emails with comma or Enter</p>
        </div>

        {/* Email chips */}
        {emails.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {emails.map(email => (
              <span key={email} className="flex items-center gap-1 bg-[#DEEBFF] text-[#0052CC] text-xs font-medium px-2 py-1 rounded">
                {email}
                <button onClick={() => setEmails(prev => prev.filter(x => x !== email))}
                  className="hover:text-[#DE350B] transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Role selection */}
        <div>
          <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Role in project</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setRole('member')}
              className={clsx('flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left',
                role === 'member' ? 'border-[#0052CC] bg-[#DEEBFF]' : 'border-[#DFE1E6] hover:border-[#4C9AFF]')}>
              <User className={clsx('w-4 h-4', role === 'member' ? 'text-[#0052CC]' : 'text-[#7A869A]')} />
              <div>
                <div className="text-sm font-semibold text-[#172B4D]">Member</div>
                <div className="text-[10px] text-[#7A869A]">View & edit tasks</div>
              </div>
            </button>
            <button onClick={() => setRole('admin')}
              className={clsx('flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left',
                role === 'admin' ? 'border-[#FF8B00] bg-[#FFFAE6]' : 'border-[#DFE1E6] hover:border-[#FF8B00]')}>
              <Shield className={clsx('w-4 h-4', role === 'admin' ? 'text-[#FF8B00]' : 'text-[#7A869A]')} />
              <div>
                <div className="text-sm font-semibold text-[#172B4D]">Admin</div>
                <div className="text-[10px] text-[#7A869A]">Full access</div>
              </div>
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-[#DE350B]">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 btn-secondary justify-center">Cancel</button>
          <button onClick={handleSend} disabled={emails.length === 0 || sending}
            className="flex-1 btn-primary justify-center disabled:opacity-40 disabled:cursor-not-allowed">
            {sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</> : `Send ${emails.length || ''} invite${emails.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Project Members Modal ────────────────────────────────────────────
function ProjectMembersModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [members, setMembers]   = useState<(ProjectMember & { profile: Profile })[]>([])
  const [loading, setLoading]   = useState(true)
  const [showInvite, setShowInvite] = useState(false)

  async function loadMembers() {
    setLoading(true)
    const { data } = await supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true })
    setMembers((data ?? []) as any)
    setLoading(false)
  }

  useEffect(() => { loadMembers() }, [project.id])

  async function handleRemove(memberId: string) {
    await supabase.from('project_members').delete().eq('id', memberId)
    await loadMembers()
  }

  if (showInvite) {
    return (
      <InviteToProjectModal project={project} onClose={() => { setShowInvite(false); loadMembers() }} />
    )
  }

  return (
    <Modal title={`${project.name} — Members`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#5E6C84]">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <UserPlus className="w-3.5 h-3.5" /> Invite people
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[#0052CC]" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-[#7A869A] text-sm">No members yet. Invite people to this project.</div>
        ) : (
          <div className="divide-y divide-[#F4F5F7] border border-[#DFE1E6] rounded-lg overflow-hidden">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-[#F4F5F7] transition-colors">
                {m.profile?.avatar_url ? (
                  <img src={m.profile.avatar_url} alt={m.profile.name} className="w-8 h-8 rounded-full object-cover border border-[#DFE1E6]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#0052CC] flex items-center justify-center text-white text-xs font-bold">
                    {m.profile?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#172B4D] truncate">{m.profile?.name ?? 'Unknown'}</div>
                  <div className="text-xs text-[#7A869A]">Added {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</div>
                </div>
                <span className={clsx(
                  'text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 capitalize',
                  m.role === 'admin' ? 'bg-[#FFFAE6] text-amber-700 border-amber-200' : 'bg-[#F4F5F7] text-[#5E6C84] border-[#DFE1E6]'
                )}>
                  {m.role}
                </span>
                <button onClick={() => handleRemove(m.id)}
                  className="p-1.5 rounded text-[#7A869A] hover:text-[#DE350B] hover:bg-[#FFEBE6] transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Project Card ─────────────────────────────────────────────────────
interface ProjectStats {
  openBugs: number
  openFeatures: number
  activeSprint: string | null
  memberCount: number
}

function ProjectCard({ project, stats, onOpen, onManageMembers }: {
  project: Project
  stats: ProjectStats | null
  onOpen: () => void
  onManageMembers: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="bg-white rounded-xl border border-[#DFE1E6] flex flex-col hover:shadow-md transition-all duration-200"
      style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.08)' }}>

      {/* Header */}
      <div className="p-5 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: project.avatar_color }}>
          {project.key.slice(0,2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[#172B4D] text-sm leading-tight truncate">{project.name}</div>
          <div className="text-[11px] text-[#7A869A] mt-0.5 font-mono tracking-wide">{project.key}</div>
          {project.description && (
            <p className="text-xs text-[#5E6C84] mt-1.5 line-clamp-2 leading-relaxed">{project.description}</p>
          )}
        </div>
        {/* Options menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 rounded-md text-[#7A869A] hover:bg-[#F4F5F7] hover:text-[#172B4D] transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg z-10 overflow-hidden"
              style={{ border: '1px solid #DFE1E6', boxShadow: '0 4px 16px rgba(9,30,66,0.15)' }}>
              <button onClick={() => { setMenuOpen(false); onManageMembers() }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[#172B4D] hover:bg-[#F4F5F7]">
                <Users className="w-3.5 h-3.5 text-[#626F86]" /> Manage members
              </button>
              <button onClick={() => { setMenuOpen(false); onOpen() }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[#172B4D] hover:bg-[#F4F5F7]">
                <Settings2 className="w-3.5 h-3.5 text-[#626F86]" /> Open project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pb-3 grid grid-cols-3 gap-3">
        {stats === null ? (
          <div className="col-span-3 flex items-center justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#B3BAC5]" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Bug className="w-3.5 h-3.5 text-[#DE350B]" />
                <span className="text-lg font-bold text-[#172B4D] leading-none">{stats.openBugs}</span>
              </div>
              <span className="text-[10px] text-[#7A869A] font-medium">Open issues</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#6554C0]" />
                <span className="text-lg font-bold text-[#172B4D] leading-none">{stats.openFeatures}</span>
              </div>
              <span className="text-[10px] text-[#7A869A] font-medium">Features</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#0052CC]" />
                <span className="text-lg font-bold text-[#172B4D] leading-none">{stats.memberCount}</span>
              </div>
              <span className="text-[10px] text-[#7A869A] font-medium">Members</span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 pt-2 border-t border-[#F4F5F7] flex items-center gap-2">
        <div className="flex-1 min-w-0">
          {stats?.activeSprint ? (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#36B37E] flex-shrink-0" />
              <span className="text-[11px] text-[#5E6C84] truncate font-medium">{stats.activeSprint}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DFE1E6] flex-shrink-0" />
              <span className="text-[11px] text-[#B3BAC5]">No active sprint</span>
            </div>
          )}
        </div>
        <button onClick={onManageMembers}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-[#DFE1E6] text-[#42526E] hover:bg-[#F4F5F7] transition-colors flex-shrink-0">
          <UserPlus className="w-3 h-3" /> Invite
        </button>
        <button onClick={onOpen}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white transition-colors flex-shrink-0"
          style={{ background: '#0052CC' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0747A6'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0052CC'}>
          Open <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="px-5 pb-3 text-[10px] text-[#B3BAC5]">
        Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
      </div>
    </div>
  )
}

// ── ProjectsOverview ─────────────────────────────────────────────────
export default function ProjectsOverview({ onOpenProject }: {
  onOpenProject: (project: Project) => void
}) {
  const { projects, setProject, addProject, setBugs, setFeatures, setSprints, user } = useStore()
  const [stats, setStats]           = useState<Record<string, ProjectStats>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [membersProject, setMembersProject] = useState<Project | null>(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (projects.length === 0) { setLoading(false); return }
    const ids = projects.map(p => p.id)

    Promise.all([
      supabase.from('bugs').select('project_id, status, priority').in('project_id', ids),
      supabase.from('features').select('project_id, status').in('project_id', ids),
      supabase.from('sprints').select('project_id, status, name').in('project_id', ids),
      supabase.from('project_members').select('project_id').in('project_id', ids),
    ]).then(([bugRes, featRes, sprintRes, memberRes]) => {
      const bugs       = bugRes.data    ?? []
      const features   = featRes.data   ?? []
      const sprints    = sprintRes.data ?? []
      const pmembers   = memberRes.data ?? []

      const computed: Record<string, ProjectStats> = {}
      for (const p of projects) {
        const pid = p.id
        const pBugs    = bugs.filter((b: any) => b.project_id === pid)
        const pFeat    = features.filter((f: any) => f.project_id === pid)
        const pSprints = sprints.filter((s: any) => s.project_id === pid)
        const pMembers = pmembers.filter((m: any) => m.project_id === pid)
        const active   = pSprints.find((s: any) => s.status === 'active')
        computed[pid] = {
          openBugs:     pBugs.filter((b: any) => b.status !== 'done').length,
          openFeatures: pFeat.filter((f: any) => f.status !== 'done').length,
          activeSprint: active ? active.name : null,
          memberCount:  pMembers.length,
        }
      }
      setStats(computed)
      setLoading(false)
    })
  }, [projects])

  function handleCreated(p: Project) {
    addProject(p)
    setShowCreate(false)
  }

  function handleOpen(p: Project) {
    setProject(p); setBugs([]); setFeatures([]); setSprints([])
    onOpenProject(p)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Projects</h1>
          <p className="text-sm text-[#5E6C84] mt-0.5">
            {projects.length} project{projects.length !== 1 ? 's' : ''} — visible to admins only
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Create project
        </button>
      </div>

      {/* Empty state */}
      {projects.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-[#DEEBFF] rounded-2xl flex items-center justify-center mb-5">
            <FolderKanban className="w-10 h-10 text-[#0052CC]" />
          </div>
          <h2 className="text-lg font-bold text-[#172B4D] mb-1">No projects yet</h2>
          <p className="text-sm text-[#5E6C84] mb-5 max-w-xs">
            Create your first project and invite your team members to collaborate.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Create your first project
          </button>
        </div>
      )}

      {/* Projects grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              stats={loading ? null : (stats[p.id] ?? null)}
              onOpen={() => handleOpen(p)}
              onManageMembers={() => setMembersProject(p)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}

      {membersProject && (
        <ProjectMembersModal project={membersProject} onClose={() => setMembersProject(null)} />
      )}
    </div>
  )
}
