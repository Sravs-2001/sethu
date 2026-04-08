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

export default function AppLayout() {
  const { activeView, setProfiles, setChannels, setActiveChannel } = useStore()

  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => {
      if (data) setProfiles(data)
    })
    supabase.from('channels').select('*').order('name').then(({ data }) => {
      if (data) {
        setChannels(data)
        if (data.length > 0) setActiveChannel(data[0])
      }
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
    <div className="h-screen flex" style={{ background: '#f4f4f8' }}>
      <Sidebar />
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
  )
}
