'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Users, Shield, UserPlus, Link2, Copy, Check, X, Loader2, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

const AVATAR_COLORS = ['#0052CC', '#6554C0', '#36B37E', '#FF5630', '#00B8D9', '#FF8B00', '#403294']

function getAvatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

interface Member {
  user_id: string
  role: string
  profiles: { name: string; avatar_url?: string; created_at: string } | null
}

interface InviteModalProps { projectId: string; onClose: () => void }

function InviteModal({ projectId, onClose }: InviteModalProps) {
  const [role, setRole]     = useState<'member' | 'admin'>('member')
  const [link, setLink]     = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    const res = await fetch('/api/invite-link', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, project_id: projectId }),
    })
    const data = await res.json()
    setLink(data.link ?? '')
    setLoading(false)
  }

  async function copy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(9,30,66,0.54)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DFE1E6]">
          <h2 className="text-base font-bold text-[#172B4D]">Invite people to this project</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#7A869A]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-[#5E6C84]">
            The invite link gives access to <strong>this project only</strong>. It expires in 7 days.
          </p>
          <div>
            <p className="text-xs font-semibold text-[#5E6C84] mb-2">Invite as</p>
            <div className="grid grid-cols-2 gap-2">
              {(['member', 'admin'] as const).map(r => (
                <button key={r} onClick={() => { setRole(r); setLink('') }}
                  className={clsx(
                    'flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-left transition-all',
                    role === r ? 'border-[#0052CC] bg-[#DEEBFF]' : 'border-[#DFE1E6] hover:border-[#B3BAC5]'
                  )}>
                  <span className={clsx('text-sm font-bold capitalize', role === r ? 'text-[#0052CC]' : 'text-[#172B4D]')}>
                    {r === 'admin' ? '⭐ Admin' : '👤 Member'}
                  </span>
                  <span className="text-[11px] text-[#5E6C84]">
                    {r === 'admin' ? 'Manage project & team' : 'View & work on issues'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {!link ? (
            <button onClick={generate} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: '#0052CC' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Generate invite link
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#5E6C84]">Copy & share this link</p>
              <div className="flex gap-2">
                <input readOnly value={link}
                  className="flex-1 text-xs bg-[#F4F5F7] border border-[#DFE1E6] rounded-lg px-3 py-2.5 text-[#172B4D] font-mono truncate" />
                <button onClick={copy}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold border transition-all flex-shrink-0',
                    copied ? 'bg-[#E3FCEF] border-green-200 text-[#006644]' : 'bg-white border-[#DFE1E6] text-[#172B4D] hover:bg-[#F4F5F7]'
                  )}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <button onClick={generate} disabled={loading}
                className="text-xs text-[#0052CC] hover:underline">
                Regenerate link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeamView() {
  const { project, user } = useStore()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [filter, setFilter] = useState<'all' | 'admin' | 'member'>('all')

  const isAdmin = user?.role === 'admin'

  async function loadMembers() {
    if (!project?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('project_members')
      .select('user_id, role, profiles(name, avatar_url, created_at)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true })
    setMembers((data ?? []) as Member[])
    setLoading(false)
  }

  useEffect(() => { loadMembers() }, [project?.id])

  async function removeMember(userId: string) {
    if (!project?.id || userId === user?.id) return
    await supabase.from('project_members').delete()
      .eq('project_id', project.id).eq('user_id', userId)
    setMembers(m => m.filter(x => x.user_id !== userId))
  }

  async function changeRole(userId: string, newRole: 'admin' | 'member') {
    if (!project?.id) return
    await supabase.from('project_members').update({ role: newRole })
      .eq('project_id', project.id).eq('user_id', userId)
    setMembers(m => m.map(x => x.user_id === userId ? { ...x, role: newRole } : x))
  }

  const admins  = members.filter(m => m.role === 'admin')
  const regular = members.filter(m => m.role === 'member')
  const filtered = filter === 'all' ? members : filter === 'admin' ? admins : regular

  return (
    <div className="h-full overflow-y-auto bg-[#F4F5F7]">
      {showInvite && project && (
        <InviteModal projectId={project.id} onClose={() => { setShowInvite(false); loadMembers() }} />
      )}

      {/* Page header */}
      <div className="bg-white border-b border-[#DFE1E6] px-8 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#172B4D]">People</h1>
              <p className="text-sm text-[#5E6C84] mt-0.5">
                {members.length} {members.length === 1 ? 'member' : 'members'} in <strong>{project?.name}</strong>
                {' '}&middot; {admins.length} admin{admins.length !== 1 ? 's' : ''} &middot; {regular.length} member{regular.length !== 1 ? 's' : ''}
              </p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowInvite(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all"
                style={{ background: '#0052CC' }}>
                <UserPlus className="w-4 h-4" />
                Invite people
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mt-4">
            {(['all', 'admin', 'member'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-semibold transition-all',
                  filter === f ? 'bg-[#DEEBFF] text-[#0052CC]' : 'text-[#5E6C84] hover:bg-[#F4F5F7]'
                )}>
                {f === 'all' ? `All (${members.length})` : f === 'admin' ? `Admins (${admins.length})` : `Members (${regular.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(m => {
              const profile = m.profiles
              if (!profile) return null
              const initials = profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              const color = getAvatarColor(profile.name)
              const isSelf = m.user_id === user?.id

              return (
                <div key={m.user_id}
                  className="bg-white rounded-xl border border-[#DFE1E6] p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
                  style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.08)' }}>
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#DFE1E6]" />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: color }}>
                        {initials}
                      </div>
                    )}
                    {m.role === 'admin' && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white"
                        title="Admin">
                        <Shield className="w-2 h-2 text-amber-900" />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-[#172B4D] truncate">{profile.name}</span>
                      {isSelf && <span className="text-[10px] text-[#7A869A] bg-[#F4F5F7] px-1.5 py-0.5 rounded">you</span>}
                    </div>
                    <span className={clsx(
                      'inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize mt-0.5',
                      m.role === 'admin'
                        ? 'bg-[#FFFAE6] text-amber-700 border-amber-200'
                        : 'bg-[#F4F5F7] text-[#5E6C84] border-[#DFE1E6]'
                    )}>
                      {m.role}
                    </span>
                    <p className="text-[11px] text-[#97A0AF] mt-1.5">
                      Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                    </p>

                    {/* Admin actions */}
                    {isAdmin && !isSelf && (
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => changeRole(m.user_id, m.role === 'admin' ? 'member' : 'admin')}
                          className="text-[11px] font-semibold text-[#0052CC] hover:underline">
                          Make {m.role === 'admin' ? 'member' : 'admin'}
                        </button>
                        <span className="text-[#DFE1E6]">·</span>
                        <button
                          onClick={() => removeMember(m.user_id)}
                          className="text-[11px] font-semibold text-[#DE350B] hover:underline flex items-center gap-0.5">
                          <Trash2 className="w-2.5 h-2.5" /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[#F4F5F7] rounded-full flex items-center justify-center mb-4 border border-[#DFE1E6]">
              <Users className="w-8 h-8 text-[#B3BAC5]" />
            </div>
            <p className="text-base font-semibold text-[#172B4D]">No members yet</p>
            <p className="text-sm text-[#7A869A] mt-1">Invite people to collaborate on this project.</p>
            {isAdmin && (
              <button onClick={() => setShowInvite(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white"
                style={{ background: '#0052CC' }}>
                <UserPlus className="w-4 h-4" />
                Invite people
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
