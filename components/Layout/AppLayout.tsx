'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import Sidebar from './Sidebar'
import Dashboard from '@/components/Dashboard/Dashboard'
import BugBoard from '@/components/Bugs/BugBoard'
import FeatureList from '@/components/Features/FeatureList'
import SprintBoard from '@/components/Sprint/SprintBoard'
import ChatPanel from '@/components/Chat/ChatPanel'
import TeamView from '@/components/Team/TeamView'
import type { View } from '@/types'
import { LayoutDashboard, Bug, Sparkles, Rocket, MessageSquare, Users, ChevronRight, ArrowLeft, ShieldCheck } from 'lucide-react'

const VIEW_META: Record<View, { label: string; icon: React.FC<{ className?: string }> }> = {
  dashboard: { label: 'Dashboard',    icon: LayoutDashboard },
  bugs:      { label: 'Bug Tracker',  icon: Bug             },
  features:  { label: 'Features',     icon: Sparkles        },
  sprints:   { label: 'Sprint Board', icon: Rocket          },
  chat:      { label: 'Chat',         icon: MessageSquare   },
  team:      { label: 'Team',         icon: Users           },
}

function TopHeader({ view }: { view: View }) {
  const { project } = useStore()
  const meta = VIEW_META[view]
  const Icon = meta.icon
  return (
    <header className="flex-shrink-0 flex items-center gap-2 px-5 h-12 bg-white"
      style={{ borderBottom: '1px solid #DFE1E6' }}>
      <span className="text-xs font-medium" style={{ color: '#42526E' }}>{project?.name ?? 'Project'}</span>
      <ChevronRight className="w-3 h-3" style={{ color: '#C1C7D0' }} />
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color: '#5E6C84' }} />
        <span className="text-xs font-semibold" style={{ color: '#172B4D' }}>{meta.label}</span>
      </div>
    </header>
  )
}

export default function AppLayout({ onBackToAdmin }: { onBackToAdmin?: () => void }) {
  const { activeView, setProfiles, setChannels, setActiveChannel, project } = useStore()

  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => { if (data) setProfiles(data) })
    supabase.from('channels').select('*').order('name').then(({ data }) => {
      if (data) { setChannels(data); if (data.length > 0) setActiveChannel(data[0]) }
    })
  }, [])

  const views: Record<string, JSX.Element> = {
    team:      <TeamView />,
    dashboard: <Dashboard />,
    bugs:      <BugBoard />,
    features:  <FeatureList />,
    sprints:   <SprintBoard />,
  }

  const isChatView = activeView === 'chat'
  const isTeamView = activeView === 'team'

  return (
    <div className="h-screen flex flex-col bg-[#F4F5F7]">
      {/* Admin back banner */}
      {onBackToAdmin && (
        <div className="flex-shrink-0 flex items-center gap-3 px-5 py-2 z-40"
          style={{ background: '#172B4D', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Viewing <span className="text-white font-semibold">{project?.name ?? 'project'}</span> as a member
          </span>
          <button onClick={onBackToAdmin}
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: '#4C9AFF' }}>
            <ArrowLeft className="w-3 h-3" /> Back to Admin Panel
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopHeader view={activeView} />
          <main className="flex-1 flex min-w-0 overflow-hidden">
            {isChatView ? (
              <ChatPanel fullWidth />
            ) : isTeamView ? (
              <div className="flex-1 overflow-y-auto min-w-0">
                <TeamView />
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto min-w-0">
                  {views[activeView]}
                </div>
                <ChatPanel />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
