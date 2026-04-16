'use client'

import { useEffect, useState } from 'react'
import { projectService, profileService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import {
  Users, Shield, User, Plus, Trash2,
  CheckCircle, Loader2, UserPlus, Mail, X, ChevronDown
} from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import type { Project, Profile, ProjectMember } from '@/types'

interface MemberWithProjects extends Profile {
  projectMemberships: { project_id: string; project_name: string; role: string }[]
}

export default function AdminTeamView() {
  const { user, projects } = useStore()
  const [members, setMembers]           = useState<MemberWithProjects[]>([])
  const [loading, setLoading]           = useState(true)
  const [showInvite, setShowInvite]     = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(projects[0] ?? null)

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) setSelectedProject(projects[0])
  }, [projects])

  async function loadTeam() {
    setLoading(true)
    // Load all profiles + their project memberships
    const { data: pms } = await projectService.getAllMembers()
    const { data: allProjects } = await projectService.getAllProjectNames()

    // Group by user
    const byUser: Record<string, MemberWithProjects> = {}
    for (const pm of (pms ?? []) as any[]) {
      if (!pm.profile) continue
      if (!byUser[pm.user_id]) {
        byUser[pm.user_id] = {
          ...pm.profile,
          projectMemberships: [],
        }
      }
      const proj = (allProjects ?? []).find((p: any) => p.id === pm.project_id)
      byUser[pm.user_id].projectMemberships.push({
        project_id: pm.project_id,
        project_name: proj?.name ?? 'Unknown project',
        role: pm.role,
      })
    }

    setMembers(Object.values(byUser))
    setLoading(false)
  }

  useEffect(() => { loadTeam() }, [])

  async function handleRemoveFromProject(userId: string, projectId: string) {
    await projectService.removeMember(projectId, userId)
    await loadTeam()
  }

  async function handleRoleChange(userId: string, newRole: 'admin' | 'member') {
    await profileService.updateRole(userId, newRole)
    await loadTeam()
  }

  const admins  = members.filter(m => m.role === 'admin')
  const regular = members.filter(m => m.role === 'member')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">People</h1>
          <p className="text-sm text-[#5E6C84] mt-0.5">
            {members.length} member{members.length !== 1 ? 's' : ''} across all projects
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Invite to project
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[#F4F5F7] rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-[#B3BAC5]" />
          </div>
          <h2 className="text-base font-semibold text-[#172B4D] mb-1">No team members yet</h2>
          <p className="text-sm text-[#7A869A] mb-4 max-w-xs">
            Invite people to your projects. They'll only see the projects you add them to.
          </p>
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Invite people
          </button>
        </div>
      ) : (
        <>
          {admins.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#5E6C84]">Admins</span>
                <span className="text-xs bg-[#FFFAE6] text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">{admins.length}</span>
              </div>
              <MemberTable
                profiles={admins}
                currentUserId={user?.id}
                onRoleChange={handleRoleChange}
                onRemoveFromProject={handleRemoveFromProject}
              />
            </section>
          )}

          {regular.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-3.5 h-3.5 text-[#5E6C84]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#5E6C84]">Members</span>
                <span className="text-xs bg-[#F4F5F7] text-[#5E6C84] border border-[#DFE1E6] rounded-full px-2 py-0.5 font-semibold">{regular.length}</span>
              </div>
              <MemberTable
                profiles={regular}
                currentUserId={user?.id}
                onRoleChange={handleRoleChange}
                onRemoveFromProject={handleRemoveFromProject}
              />
            </section>
          )}
        </>
      )}

      {showInvite && (
        <InvitePanel
          projects={projects}
          currentUser={user}
          onClose={() => { setShowInvite(false); loadTeam() }}
        />
      )}
    </div>
  )
}

// ── Invite Panel ─────────────────────────────────────────────────────
function InvitePanel({ projects, currentUser, onClose }: {
  projects: Project[]
  currentUser: Profile | null
  onClose: () => void
}) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(projects[0] ?? null)
  const [emailInput, setEmailInput] = useState('')
  const [emails, setEmails]         = useState<string[]>([])
  const [role, setRole]             = useState<'member' | 'admin'>('member')
  const [sending, setSending]       = useState(false)
  const [sentCount, setSentCount]   = useState(0)
  const [done, setDone]             = useState(false)
  const [projectDropOpen, setProjectDropOpen] = useState(false)

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  function addEmail(raw: string) {
    const list = raw.split(/[\s,;]+/).map(s => s.trim().toLowerCase())
      .filter(s => isValidEmail(s) && !emails.includes(s))
    setEmails(prev => [...prev, ...list])
    setEmailInput('')
  }

  async function handleSend() {
    if (!emails.length || !selectedProject) return
    setSending(true)
    let count = 0
    for (const email of emails) {
      try {
        const res = await fetch('/api/team/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role, project_id: selectedProject.id, invited_by: currentUser?.id }),
        })
        if (res.ok) { count++; setSentCount(count) }
      } catch { /* continue */ }
    }
    setSending(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
        style={{ border: '1px solid #DFE1E6' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DFE1E6]">
          <h2 className="text-base font-bold text-[#172B4D]">Invite people to project</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-[#7A869A] hover:bg-[#F4F5F7] hover:text-[#172B4D] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#E3FCEF] flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-[#36B37E]" />
            </div>
            <div>
              <p className="font-bold text-[#172B4D] text-lg mb-1">Invites sent!</p>
              <p className="text-sm text-[#5E6C84]">
                {sentCount} invitation{sentCount !== 1 ? 's' : ''} sent to <strong>{selectedProject?.name}</strong>.
                <br/>People will receive an email to create their account.
              </p>
            </div>
            <button onClick={onClose} className="btn-primary">Done</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Project selector */}
            <div>
              <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Select project</label>
              <div className="relative">
                <button onClick={() => setProjectDropOpen(o => !o)}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-white border border-[#DFE1E6] rounded-md text-left hover:border-[#4C9AFF] transition-colors">
                  {selectedProject ? (
                    <>
                      <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ background: selectedProject.avatar_color }}>
                        {selectedProject.key.slice(0,2)}
                      </div>
                      <span className="text-sm font-medium text-[#172B4D] flex-1">{selectedProject.name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-[#B3BAC5] flex-1">Choose a project…</span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-[#7A869A]" />
                </button>
                {projectDropOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white rounded-lg z-10 overflow-hidden"
                    style={{ border: '1px solid #DFE1E6', boxShadow: '0 4px 16px rgba(9,30,66,0.15)' }}>
                    {projects.map(p => (
                      <button key={p.id} onClick={() => { setSelectedProject(p); setProjectDropOpen(false) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-[#F4F5F7] transition-colors">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: p.avatar_color }}>
                          {p.key.slice(0,2)}
                        </div>
                        <span className="font-medium text-[#172B4D]">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Emails */}
            <div>
              <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Email addresses</label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white border border-[#DFE1E6] rounded-md px-2.5 focus-within:border-[#4C9AFF] focus-within:ring-2 focus-within:ring-[#4C9AFF]/20 transition-all">
                  <Mail className="w-3.5 h-3.5 text-[#B3BAC5] flex-shrink-0" />
                  <input type="text" value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(emailInput) } }}
                    placeholder="name@company.com"
                    className="flex-1 py-2 text-sm bg-transparent outline-none text-[#172B4D] placeholder-[#B3BAC5]"
                  />
                </div>
                <button onClick={() => addEmail(emailInput)} className="btn-primary flex-shrink-0">Add</button>
              </div>
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {emails.map(email => (
                    <span key={email} className="flex items-center gap-1 bg-[#DEEBFF] text-[#0052CC] text-xs font-medium px-2 py-1 rounded">
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

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Project role</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setRole('member')}
                  className={clsx('flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-colors',
                    role === 'member' ? 'border-[#0052CC] bg-[#DEEBFF]' : 'border-[#DFE1E6] hover:border-[#4C9AFF]')}>
                  <User className={clsx('w-4 h-4 flex-shrink-0', role === 'member' ? 'text-[#0052CC]' : 'text-[#7A869A]')} />
                  <div>
                    <div className="text-sm font-semibold text-[#172B4D]">Member</div>
                    <div className="text-[10px] text-[#7A869A]">View & edit tasks</div>
                  </div>
                </button>
                <button onClick={() => setRole('admin')}
                  className={clsx('flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-colors',
                    role === 'admin' ? 'border-[#FF8B00] bg-[#FFFAE6]' : 'border-[#DFE1E6] hover:border-[#FF8B00]')}>
                  <Shield className={clsx('w-4 h-4 flex-shrink-0', role === 'admin' ? 'text-[#FF8B00]' : 'text-[#7A869A]')} />
                  <div>
                    <div className="text-sm font-semibold text-[#172B4D]">Admin</div>
                    <div className="text-[10px] text-[#7A869A]">Full access</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Note about project isolation */}
            <div className="flex items-start gap-2 p-3 bg-[#FFFAE6] border border-amber-200 rounded-lg">
              <Shield className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                This person will only see <strong>{selectedProject?.name ?? 'this project'}</strong>.
                They won't see other projects or team members unless you add them there too.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 btn-secondary justify-center">Cancel</button>
              <button onClick={handleSend} disabled={emails.length === 0 || !selectedProject || sending}
                className="flex-1 btn-primary justify-center disabled:opacity-40 disabled:cursor-not-allowed">
                {sending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                  : `Send invite${emails.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Member Table ─────────────────────────────────────────────────────
function MemberTable({ profiles, currentUserId, onRoleChange, onRemoveFromProject }: {
  profiles: MemberWithProjects[]
  currentUserId?: string
  onRoleChange: (id: string, role: 'admin' | 'member') => void
  onRemoveFromProject: (userId: string, projectId: string) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-[#DFE1E6] divide-y divide-[#F4F5F7] overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.06)' }}>
      {profiles.map(p => (
        <div key={p.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#F4F5F7] transition-colors">
          {/* Avatar */}
          <div className="flex-shrink-0 mt-0.5">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={p.name} className="w-8 h-8 rounded-full object-cover border border-[#DFE1E6]" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#0052CC] flex items-center justify-center text-white text-xs font-bold">
                {p.name[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-[#172B4D]">{p.name}</span>
              {p.id === currentUserId && (
                <span className="text-[10px] text-[#7A869A]">(you)</span>
              )}
              <span className={clsx(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize',
                p.role === 'admin' ? 'bg-[#FFFAE6] text-amber-700 border-amber-200' : 'bg-[#F4F5F7] text-[#5E6C84] border-[#DFE1E6]'
              )}>
                {p.role}
              </span>
            </div>
            {/* Project badges */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {p.projectMemberships.map(pm => (
                <span key={pm.project_id} className="group flex items-center gap-1 text-[11px] bg-[#F4F5F7] text-[#42526E] border border-[#DFE1E6] rounded px-1.5 py-0.5">
                  {pm.project_name}
                  {p.id !== currentUserId && (
                    <button onClick={() => onRemoveFromProject(p.id, pm.project_id)}
                      className="opacity-0 group-hover:opacity-100 text-[#7A869A] hover:text-[#DE350B] transition-all ml-0.5">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="text-xs text-[#7A869A] mt-1">
              Joined {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
            </div>
          </div>

          {/* Role toggle */}
          {p.id !== currentUserId && (
            <button
              onClick={() => onRoleChange(p.id, p.role === 'admin' ? 'member' : 'admin')}
              className="flex-shrink-0 text-xs font-medium text-[#0052CC] hover:bg-[#DEEBFF] px-2 py-1 rounded transition-colors">
              {p.role === 'admin' ? 'Make member' : 'Make admin'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
