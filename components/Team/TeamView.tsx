'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Users, Shield, UserPlus, Link2, Copy, Check, ChevronDown, X, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

const AVATAR_COLORS = ['#0052CC', '#6554C0', '#36B37E', '#FF5630', '#00B8D9', '#FF8B00', '#403294']

function getAvatarColor(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

interface InviteModalProps { onClose: () => void }
function InviteModal({ onClose }: InviteModalProps) {
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    const res = await fetch('/api/invite-link', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
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
          <h2 className="text-base font-bold text-[#172B4D]">Invite people to workspace</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#7A869A]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#5E6C84] mb-2">Invite as</p>
            <div className="grid grid-cols-2 gap-2">
              {(['member', 'admin'] as const).map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={clsx(
                    'flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-left transition-all',
                    role === r ? 'border-[#0052CC] bg-[#DEEBFF]' : 'border-[#DFE1E6] hover:border-[#B3BAC5]'
                  )}>
                  <span className={clsx('text-sm font-bold capitalize', role === r ? 'text-[#0052CC]' : 'text-[#172B4D]')}>
                    {r === 'admin' ? '⭐ Admin' : '👤 Member'}
                  </span>
                  <span className="text-[11px] text-[#5E6C84]">
                    {r === 'admin' ? 'Full access, manage team' : 'Can view & edit issues'}
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
              <p className="text-xs font-semibold text-[#5E6C84]">Invite link (expires in 7 days)</p>
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
              <p className="text-[11px] text-[#7A869A]">Anyone with this link will join as <strong>{role}</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeamView() {
  const { profiles, setProfiles, user } = useStore()
  const [showInvite, setShowInvite] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedDone, setSeedDone] = useState(false)
  const [filter, setFilter] = useState<'all' | 'admin' | 'member'>('all')

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: true })
      .then(({ data }) => data && setProfiles(data))
  }, [])

  async function seedDemo() {
    setSeeding(true)
    await fetch('/api/demo-users', { method: 'POST' })
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
    if (data) setProfiles(data)
    setSeedDone(true)
    setSeeding(false)
  }

  const isAdmin = user?.role === 'admin'
  const filtered = profiles.filter(p => filter === 'all' || p.role === filter)
  const admins = profiles.filter(p => p.role === 'admin')
  const members = profiles.filter(p => p.role === 'member')

  return (
    <div className="h-full overflow-y-auto bg-[#F4F5F7]">
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      {/* Page header */}
      <div className="bg-white border-b border-[#DFE1E6] px-8 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#172B4D]">People</h1>
              <p className="text-sm text-[#5E6C84] mt-0.5">
                {profiles.length} {profiles.length === 1 ? 'member' : 'members'} &middot;&nbsp;
                {admins.length} admin{admins.length !== 1 ? 's' : ''} &middot;&nbsp;
                {members.length} member{members.length !== 1 ? 's' : ''}
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
                  'px-3 py-1.5 rounded-md text-sm font-semibold transition-all capitalize',
                  filter === f ? 'bg-[#DEEBFF] text-[#0052CC]' : 'text-[#5E6C84] hover:bg-[#F4F5F7]'
                )}>
                {f === 'all' ? `All (${profiles.length})` : f === 'admin' ? `Admins (${admins.length})` : `Members (${members.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6 space-y-4">

        {/* Demo users banner */}
        {isAdmin && profiles.filter(p => p.name.includes('Alice') || p.name.includes('Bob')).length === 0 && (
          <div className="flex items-center gap-4 bg-[#DEEBFF] border border-[#B3D4FF] rounded-xl px-5 py-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-[#0052CC]">Add demo team members</p>
              <p className="text-xs text-[#42526E] mt-0.5">
                Seed 5 example users (alice, bob, carol, david, emma @mailinator.com) with password <code className="bg-white/60 px-1 rounded">demo1234</code>
              </p>
            </div>
            <button onClick={seedDemo} disabled={seeding || seedDone}
              className="flex items-center gap-2 px-4 py-2 bg-[#0052CC] text-white text-sm font-bold rounded-lg hover:bg-[#0747A6] transition-colors disabled:opacity-60 flex-shrink-0">
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '⚡'}
              {seedDone ? 'Done!' : seeding ? 'Seeding…' : 'Seed demo users'}
            </button>
          </div>
        )}

        {/* People grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p => (
              <PersonCard key={p.id} profile={p} isSelf={p.id === user?.id} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[#F4F5F7] rounded-full flex items-center justify-center mb-4 border border-[#DFE1E6]">
              <Users className="w-8 h-8 text-[#B3BAC5]" />
            </div>
            <p className="text-base font-semibold text-[#172B4D]">No people found</p>
            <p className="text-sm text-[#7A869A] mt-1">
              {isAdmin ? 'Invite people to get started.' : 'No team members yet.'}
            </p>
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

function PersonCard({ profile, isSelf }: {
  profile: { id: string; name: string; avatar_url?: string; role: string; created_at: string }
  isSelf: boolean
}) {
  const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const color = getAvatarColor(profile.name)

  return (
    <div className="bg-white rounded-xl border border-[#DFE1E6] p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
      style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.08)' }}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-[#DFE1E6]" />
        ) : (
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold border-2"
            style={{ background: color, borderColor: color + '40' }}>
            {initials}
          </div>
        )}
        {profile.role === 'admin' && (
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
          {isSelf && <span className="text-[10px] text-[#7A869A] flex-shrink-0 bg-[#F4F5F7] px-1.5 py-0.5 rounded">you</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
          <span className={clsx(
            'text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize',
            profile.role === 'admin'
              ? 'bg-[#FFFAE6] text-amber-700 border-amber-200'
              : 'bg-[#F4F5F7] text-[#5E6C84] border-[#DFE1E6]'
          )}>
            {profile.role}
          </span>
        </div>
        <p className="text-[11px] text-[#97A0AF] mt-1.5">
          Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
