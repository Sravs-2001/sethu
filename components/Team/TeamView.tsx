'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Users, Shield, User } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

export default function TeamView() {
  const { profiles, setProfiles, user } = useStore()

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: true })
      .then(({ data }) => data && setProfiles(data))
  }, [])

  const admins  = profiles.filter(p => p.role === 'admin')
  const members = profiles.filter(p => p.role === 'member')

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="pb-3 border-b border-[#DFE1E6]">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0052CC]" />
          <h1 className="text-lg font-semibold text-[#172B4D]">Team members</h1>
        </div>
        <p className="text-xs text-[#5E6C84] mt-0.5">
          {profiles.length} {profiles.length === 1 ? 'member' : 'members'} in this project
        </p>
      </div>

      {/* Admins */}
      {admins.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">Admins</span>
            <span className="ml-1 text-xs bg-[#FFFAE6] text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">{admins.length}</span>
          </div>
          <MemberList profiles={admins} currentUserId={user?.id} />
        </section>
      )}

      {/* Members */}
      {members.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2.5">
            <User className="w-3.5 h-3.5 text-[#5E6C84]" />
            <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">Members</span>
            <span className="ml-1 text-xs bg-[#F4F5F7] text-[#5E6C84] border border-[#DFE1E6] rounded-full px-2 py-0.5 font-medium">{members.length}</span>
          </div>
          <MemberList profiles={members} currentUserId={user?.id} />
        </section>
      )}

      {profiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-[#F4F5F7] rounded-full flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-[#B3BAC5]" />
          </div>
          <p className="text-sm text-[#7A869A]">No team members yet.</p>
        </div>
      )}
    </div>
  )
}

function MemberList({ profiles, currentUserId }: {
  profiles: { id: string; name: string; avatar_url?: string; role: string; created_at: string }[]
  currentUserId?: string
}) {
  return (
    <div className="bg-white rounded border border-[#DFE1E6] divide-y divide-[#F4F5F7]"
      style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
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
            {p.role === 'admin' && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
                <Shield className="w-1.5 h-1.5 text-amber-900" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-[#172B4D] truncate">{p.name}</span>
              {p.id === currentUserId && (
                <span className="text-[10px] text-[#7A869A] flex-shrink-0">(you)</span>
              )}
            </div>
            <div className="text-xs text-[#7A869A]">
              Joined {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
            </div>
          </div>
          <span className={clsx(
            'text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize flex-shrink-0',
            p.role === 'admin'
              ? 'bg-[#FFFAE6] text-amber-700 border-amber-200'
              : 'bg-[#F4F5F7] text-[#5E6C84] border-[#DFE1E6]'
          )}>
            {p.role}
          </span>
        </div>
      ))}
    </div>
  )
}
