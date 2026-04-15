'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  LayoutGrid, Bug, Sparkles, MessageSquare, Users,
  ArrowRight, Rocket, BarChart2, Lock,
  CheckCircle, ChevronRight, Layers, Shield,
} from 'lucide-react'
import AuthModal from './AuthModal'
import JiraLogo from '@/components/ui/JiraLogo'

type AuthMode = 'login' | 'register'

// ── Mini board preview (dark mock — shown inside the light hero) ──
const COLS = [
  { title: 'To Do',       color: '#DFE1E6', items: [
    { icon: '🐛', label: 'Login crash on iOS',    p: '#DE350B', pt: 'Critical' },
    { icon: '📖', label: 'Dark mode toggle',      p: '#FF991F', pt: 'Medium'   },
  ]},
  { title: 'In Progress', color: '#0052CC', items: [
    { icon: '☑️', label: 'API rate limiting',     p: '#FF8B00', pt: 'High'     },
    { icon: '📖', label: 'Analytics v2',          p: '#FF991F', pt: 'Medium'   },
  ]},
  { title: 'Review',      color: '#6554C0', items: [
    { icon: '🐛', label: 'CSV export edge cases', p: '#36B37E', pt: 'Low'      },
  ]},
  { title: 'Done',        color: '#36B37E', items: [
    { icon: '☑️', label: 'OAuth integration',    p: '#36B37E', pt: 'Low'      },
  ]},
]

function BoardPreview() {
  return (
    <div className="rounded-xl overflow-hidden shadow-xl"
      style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#1D2125' }}>
      {/* Nav bar — exact app header */}
      <div className="flex items-center gap-2 px-3 h-10 border-b"
        style={{ background: '#1D2125', borderColor: 'rgba(255,255,255,0.06)' }}>
        <JiraLogo size={18} />
        <span className="text-white text-[11px] font-black">sethu</span>
        <span className="text-[10px] mx-1" style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Mobile App</span>
        <span className="text-[10px] mx-1" style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
        <span className="text-[10px] text-white/75 font-medium">Board</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-[#0052CC] text-white text-[8px] font-bold flex items-center justify-center">S</div>
          <div className="w-4 h-4 rounded-full bg-[#6554C0] text-white text-[8px] font-bold flex items-center justify-center">A</div>
          <div className="h-4 px-1.5 rounded text-[8px] font-bold text-white flex items-center" style={{ background: '#0052CC' }}>+ Create</div>
        </div>
      </div>
      {/* Sidebar + board */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-28 border-r flex-shrink-0 py-2"
          style={{ background: '#ffffff', borderColor: '#DFE1E6' }}>
          {['Summary','Board','Backlog','Issues','Features','People'].map((item, i) => (
            <div key={item} className={`flex items-center gap-1.5 px-2.5 py-1 mx-1 rounded text-[9px] font-medium ${i === 1 ? 'bg-[#E8EDFF] text-[#0052CC] font-semibold' : 'text-[#44546F]'}`}>
              {i === 1 && <span className="w-0.5 h-3 rounded-r-full bg-[#0052CC] absolute left-0" />}
              {item}
            </div>
          ))}
        </div>
        {/* Board columns */}
        <div className="flex-1 grid grid-cols-4 gap-1.5 p-2" style={{ background: '#F4F5F7' }}>
          {COLS.map(col => (
            <div key={col.title} className="rounded overflow-hidden"
              style={{ background: '#ffffff', border: '1px solid #DFE1E6', borderTopColor: col.color, borderTopWidth: 2 }}>
              <div className="flex items-center justify-between px-1.5 py-1">
                <span className="text-[8px] font-bold uppercase tracking-wide text-[#44546F]">{col.title}</span>
                <span className="text-[7px] bg-[#DFE1E6] text-[#626F86] px-1 rounded font-bold">{col.items.length}</span>
              </div>
              <div className="px-1 pb-1 space-y-1">
                {col.items.map((item, i) => (
                  <div key={i} className="bg-white rounded p-1.5 border border-[#DFE1E6]">
                    <div className="flex items-start gap-0.5 mb-1">
                      <span className="text-[9px]">{item.icon}</span>
                      <p className="text-[8px] text-[#172B4D] leading-tight font-medium">{item.label}</p>
                    </div>
                    <span className="inline-block text-[7px] px-1 py-0.5 rounded font-semibold"
                      style={{ background: item.p + '22', color: item.p }}>{item.pt}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Features ─────────────────────────────────────────────────────
const FEATURES = [
  { icon: LayoutGrid,   color: '#0052CC', bg: '#DEEBFF', title: 'Kanban Board',    desc: 'Board + list view. Filter by type, priority, assignee. Real-time updates across your team.' },
  { icon: Layers,       color: '#6554C0', bg: '#EAE6FF', title: 'Sprint Backlog',  desc: 'Plan sprints with goals and dates. Track velocity across completed sprints.' },
  { icon: Bug,          color: '#DE350B', bg: '#FFEBE6', title: 'Issue Tracking',  desc: 'Epics, Stories, Tasks, Bugs — each with priority, status, assignee, and sprint.' },
  { icon: Sparkles,     color: '#FF8B00', bg: '#FFFAE6', title: 'Feature Roadmap', desc: 'Manage feature requests separately from bugs. Grouped by status, linked to sprints.' },
  { icon: BarChart2,    color: '#0052CC', bg: '#DEEBFF', title: 'Reports',         desc: 'Priority breakdown, status distribution, sprint velocity, team workload charts.' },
  { icon: Lock,         color: '#36B37E', bg: '#E3FCEF', title: 'Private Projects', desc: 'Invite-only access. No one outside your invite list can see your project.' },
  { icon: MessageSquare,color: '#00B8D9', bg: '#E6FCFF', title: 'Team Chat',       desc: 'Real-time channels per project. Invite teammates with a shareable link.' },
  { icon: Users,        color: '#6554C0', bg: '#EAE6FF', title: 'Role Control',    desc: 'Admins get Reports + Settings. Members get everything else. Clear role badge in sidebar.' },
]

export default function LandingPage() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const searchParams = useSearchParams()
  const inviteToken  = searchParams.get('invite_token') ?? undefined

  // Auto-open register modal when arriving via an invite link
  useEffect(() => {
    if (inviteToken) setAuthMode('register')
  }, [inviteToken])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F4F5F7' }}>

      {/* ── Navbar — pixel-identical to app top nav ── */}
      <nav className="sticky top-0 z-50 flex items-center px-3 h-12"
        style={{ background: '#1D2125', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        <div className="flex items-center gap-2 px-2 mr-3 flex-shrink-0">
          <JiraLogo size={26} />
          <span className="text-white font-black text-sm tracking-tight">sethu</span>
        </div>

        <div className="hidden md:flex items-center gap-0.5">
          {['Features', 'How it works'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`}
              className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'white' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}>
              {l}
            </a>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <button onClick={() => setAuthMode('login')}
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'white' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}>
            Sign in
          </button>
          <button onClick={() => setAuthMode('register')}
            className="px-3 py-1.5 rounded text-sm font-bold text-white transition-colors"
            style={{ background: '#0052CC' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0065FF'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0052CC'}>
            Get started free
          </button>
        </div>
      </nav>

      {/* ── Hero — light, like the app's content area ── */}
      <section className="px-6 md:px-12 pt-16 pb-10" style={{ background: '#F4F5F7' }}>
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12">

          {/* Left copy */}
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
              style={{ background: '#DEEBFF', color: '#0052CC', border: '1px solid #B3D4FF' }}>
              <Shield className="w-3.5 h-3.5" />
              Invite-only · Private projects
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-[#172B4D] leading-tight mb-5" style={{ letterSpacing: '-0.5px' }}>
              Project management<br />
              <span style={{ color: '#0052CC' }}>your team</span> will actually use.
            </h1>

            <p className="text-lg text-[#5E6C84] leading-relaxed mb-8 max-w-lg">
              Kanban boards, sprint planning, issue tracking, features, team chat — all in one workspace. Only people you invite can see your projects.
            </p>

            <div className="flex items-center gap-3 mb-8">
              <button onClick={() => setAuthMode('register')}
                className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-bold text-white transition-all"
                style={{ background: '#0052CC' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0065FF'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0052CC'}>
                Create free workspace
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => setAuthMode('login')}
                className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-all"
                style={{ color: '#0052CC', border: '2px solid #DFE1E6', background: 'white' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#0052CC'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#DFE1E6'}>
                Sign in
              </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6">
              {[['10k+', 'Issues tracked'], ['500+', 'Teams'], ['Free', 'Forever for small teams']].map(([n, l]) => (
                <div key={l}>
                  <div className="text-lg font-black text-[#172B4D]">{n}</div>
                  <div className="text-xs text-[#7A869A]">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — board preview */}
          <div className="flex-1 w-full max-w-xl">
            <BoardPreview />
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="h-px mx-0" style={{ background: '#DFE1E6' }} />

      {/* ── Features grid ── */}
      <section id="features" className="px-6 md:px-12 py-16" style={{ background: '#F4F5F7' }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <h2 className="text-2xl font-black text-[#172B4D] mb-2">Everything your team needs</h2>
            <p className="text-[#5E6C84]">One workspace for all stages of your project — no integrations, no tab-switching.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
                style={{ border: '1px solid #DFE1E6', boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
                <div className="w-8 h-8 rounded flex items-center justify-center mb-3" style={{ background: bg }}>
                  <Icon style={{ width: 16, height: 16, color }} />
                </div>
                <p className="text-sm font-bold text-[#172B4D] mb-1">{title}</p>
                <p className="text-xs text-[#626F86] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="px-6 md:px-12 py-14"
        style={{ background: 'white', borderTop: '1px solid #DFE1E6', borderBottom: '1px solid #DFE1E6' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-[#172B4D] mb-8 text-center">Up and running in minutes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: '1', title: 'Create your project',  desc: 'Name it, pick a color, get a project key. No setup, no credit card.' },
              { num: '2', title: 'Invite your team',     desc: 'Share a link or send email invites. Uninvited users see nothing.' },
              { num: '3', title: 'Track and ship',       desc: 'Create issues, plan sprints, review the board, and deliver.' },
            ].map(({ num, title, desc }) => (
              <div key={num} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-black text-[#0052CC] flex-shrink-0"
                  style={{ background: '#DEEBFF' }}>
                  {num}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#172B4D] mb-1">{title}</p>
                  <p className="text-sm text-[#5E6C84] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Admin vs Member ── */}
      <section className="px-6 md:px-12 py-14" style={{ background: '#F4F5F7' }}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">

          {/* Admin card */}
          <div className="flex-1 bg-white rounded-lg overflow-hidden"
            style={{ border: '1px solid #DFE1E6', boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
            <div className="px-5 py-3 border-b border-[#DFE1E6] bg-[#FFFAE6] flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-amber-700">Admin view</span>
            </div>
            <div className="p-5">
              <p className="text-xs text-[#5E6C84] mb-4">Project admins see all tabs including management tools.</p>
              <div className="space-y-1.5">
                {['Summary', 'Board', 'Backlog', 'Features', 'Chat', 'People', 'Reports ★', 'Project Settings ★'].map(t => (
                  <div key={t} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium ${t.includes('★') ? 'bg-[#FFFAE6] text-amber-700 border border-amber-200' : 'bg-[#F4F5F7] text-[#44546F]'}`}>
                    <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: t.includes('★') ? '#FF8B00' : '#36B37E' }} />
                    {t.replace(' ★', '')}
                    {t.includes('★') && <span className="ml-auto text-[10px] font-bold text-amber-600">Admin only</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Member card */}
          <div className="flex-1 bg-white rounded-lg overflow-hidden"
            style={{ border: '1px solid #DFE1E6', boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
            <div className="px-5 py-3 border-b border-[#DFE1E6] bg-[#F4F5F7] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#626F86]" />
              <span className="text-sm font-bold text-[#44546F]">Member view</span>
            </div>
            <div className="p-5">
              <p className="text-xs text-[#5E6C84] mb-4">Members collaborate on all project work without admin controls.</p>
              <div className="space-y-1.5">
                {['Summary', 'Board', 'Backlog', 'Features', 'Chat', 'People'].map(t => (
                  <div key={t} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-[#F4F5F7] text-[#44546F]">
                    <CheckCircle className="w-3 h-3 flex-shrink-0 text-[#36B37E]" />
                    {t}
                  </div>
                ))}
              </div>
              <div className="mt-3 px-3 py-2 rounded text-xs text-[#7A869A] flex items-center gap-2"
                style={{ background: '#F4F5F7', border: '1px solid #DFE1E6' }}>
                <Lock className="w-3 h-3 text-[#B3BAC5]" />
                Reports & Settings are admin-only
              </div>
            </div>
          </div>

          {/* Privacy card */}
          <div className="flex-1 bg-white rounded-lg overflow-hidden"
            style={{ border: '1px solid #B3D4FF', boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
            <div className="px-5 py-3 border-b border-[#B3D4FF] bg-[#DEEBFF] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#0052CC]" />
              <span className="text-sm font-bold text-[#0052CC]">Privacy by default</span>
            </div>
            <div className="p-5">
              <p className="text-xs text-[#5E6C84] mb-4">All projects are invite-only. No one can find or join without an explicit invite.</p>
              <div className="space-y-2">
                {[
                  'Only invited members can view',
                  'Invite via link or email',
                  'Mailinator-friendly for testing',
                  'Project data fully isolated',
                ].map(t => (
                  <div key={t} className="flex items-center gap-2 text-xs text-[#172B4D]">
                    <CheckCircle className="w-3.5 h-3.5 text-[#0052CC] flex-shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="px-6 md:px-12 py-14"
        style={{ background: '#0052CC' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-black text-white mb-3">Ready to get started?</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Create your workspace, invite your team, and track your first sprint — all in under 5 minutes.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setAuthMode('register')}
              className="flex items-center gap-2 px-6 py-2.5 rounded text-sm font-bold transition-all"
              style={{ background: 'white', color: '#0052CC' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.92'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
              Create free workspace
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setAuthMode('login')}
              className="flex items-center gap-2 px-6 py-2.5 rounded text-sm font-semibold transition-all"
              style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.3)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
              Sign in
            </button>
          </div>
          <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
            No credit card required · Free forever for small teams
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 md:px-12 py-6 border-t"
        style={{ background: '#1D2125', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <JiraLogo size={20} />
            <span className="text-white font-black text-sm">sethu</span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} Sethu. Built for teams who ship.
          </p>
          <div className="flex items-center gap-5">
            {['Privacy', 'Terms', 'Support'].map(l => (
              <a key={l} href="#" className="text-xs transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {authMode && (
        <AuthModal
          defaultMode={authMode}
          inviteToken={inviteToken}
          onClose={() => setAuthMode(null)}
        />
      )}
    </div>
  )
}
