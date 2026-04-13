'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import Dashboard from '@/components/Dashboard/Dashboard'
import BugBoard from '@/components/Bugs/BugBoard'
import FeatureList from '@/components/Features/FeatureList'
import SprintBoard from '@/components/Sprint/SprintBoard'
import ChatPanel from '@/components/Chat/ChatPanel'
import TeamView from '@/components/Team/TeamView'
import IssueBoard from '@/components/Issues/IssueBoard'
import BacklogView from '@/components/Issues/BacklogView'
import CreateIssueModal from '@/components/Issues/CreateIssueModal'

export default function AppLayout({ onBackToAdmin }: { onBackToAdmin?: () => void }) {
  const { activeView, setProfiles, setChannels, setActiveChannel } = useStore()
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => { if (data) setProfiles(data) })
    supabase.from('channels').select('*').order('name').then(({ data }) => {
      if (data) {
        setChannels(data)
        if (data.length > 0) setActiveChannel(data[0])
      }
    })
  }, [])

  const isChatView = activeView === 'chat'

  const mainContent: Record<string, JSX.Element> = {
    board:     <IssueBoard   onCreateIssue={() => setShowCreateModal(true)} />,
    backlog:   <BacklogView  onCreateIssue={() => setShowCreateModal(true)} />,
    dashboard: <Dashboard />,
    bugs:      <BugBoard />,
    features:  <FeatureList />,
    sprints:   <SprintBoard />,
    team:      <TeamView />,
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F4F5F7]">
      {/* Top navigation */}
      <TopNav
        onCreateIssue={() => setShowCreateModal(true)}
        onBackToAdmin={onBackToAdmin}
      />

      {/* Main area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <Sidebar />

        {/* Content */}
        <div className="flex-1 flex min-w-0 overflow-hidden bg-white">
          {isChatView ? (
            <ChatPanel fullWidth />
          ) : (
            <div className="flex-1 overflow-hidden min-w-0">
              {mainContent[activeView] ?? <IssueBoard onCreateIssue={() => setShowCreateModal(true)} />}
            </div>
          )}
        </div>
      </div>

      {/* Global create issue modal */}
      {showCreateModal && (
        <CreateIssueModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  )
}
