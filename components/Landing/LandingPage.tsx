'use client'

import { useState } from 'react'
import {
  LayoutGrid, Bug, Sparkles, MessageSquare, Users, Zap,
  CheckCircle, ArrowRight, Shield, Rocket, BarChart3,
  ChevronRight, Star,
} from 'lucide-react'
import AuthModal from './AuthModal'
import ArrowheadIcon from '@/components/ui/ArrowheadIcon'

type AuthMode = 'login' | 'register'

// ── Mini kanban preview for the hero ─────────────────────────────
const PREVIEW_COLS = [
  {
    title: 'To Do',
    color: '#DFE1E6',
    cards: [
      { type: 'bug', label: 'Login page crash on iOS', priority: 'critical', pcolor: '#DE350B' },
      { type: 'story', label: 'Add dark mode toggle', priority: 'medium', pcolor: '#F79233' },
    ],
  },
  {
    title: 'In Progress',
    color: '#0052CC',
    cards: [
      { type: 'task', label: 'API rate limiting', priority: 'high', pcolor: '#FF8B00' },
      { type: 'story', label: 'Dashboard analytics v2', priority: 'medium', pcolor: '#F79233' },
    ],
  },
  {
    title: 'Review',
    color: '#6554C0',
    cards: [
      { type: 'bug', label: 'CSV export edge cases', priority: 'low', pcolor: '#36B37E' },
    ],
  },
  {
    title: 'Done',
    color: '#36B37E',
    cards: [
      { type: 'task', label: 'OAuth Google integration', priority: 'high', pcolor: '#FF8B00' },
      { type: 'story', label: 'Onboarding flow redesign', priority: 'low', pcolor: '#36B37E' },
    ],
  },
]

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  epic: { icon: '⚡', color: '#6554C0' },
  story: { icon: '📖', color: '#36B37E' },
  task: { icon: '☑️', color: '#0052CC' },
  bug: { icon: '🐛', color: '#DE350B' },
  subtask: { icon: '↳', color: '#626F86' },
}

function KanbanPreview() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: '#1D2125', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#161A1E' }}>
        <div className="w-6 h-6 rounded-md bg-[#0052CC] flex items-center justify-center">
          <ArrowheadIcon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-white text-xs font-bold">sethu</span>
        <span style={{ color: 'rgba(255,255,255,0.25)' }} className="text-xs mx-1">/</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }} className="text-xs">Mobile App</span>
        <span style={{ color: 'rgba(255,255,255,0.25)' }} className="text-xs mx-1">/</span>
        <span className="text-xs text-white font-medium">Board</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[9px] font-bold flex items-center justify-center">S</div>
          <div className="w-5 h-5 rounded-full bg-[#6554C0] text-white text-[9px] font-bold flex items-center justify-center">A</div>
          <div className="w-16 h-5 rounded-md text-[9px] font-bold flex items-center justify-center"
            style={{ background: '#0052CC', color: 'white' }}>+ Create</div>
        </div>
      </div>
      {/* Board columns */}
      <div className="grid grid-cols-4 gap-2 p-3">
        {PREVIEW_COLS.map(col => (
          <div key={col.title} className="rounded-lg overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderTopColor: col.color, borderTopWidth: 2 }}>
            <div className="px-2.5 py-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>{col.title}</span>
              <span className="text-[9px] px-1 rounded font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>{col.cards.length}</span>
            </div>
            <div className="px-1.5 pb-2 space-y-1.5">
              {col.cards.map((card, i) => (
                <div key={i} className="rounded-md p-2"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start gap-1.5 mb-1">
                    <span className="text-[10px] flex-shrink-0 mt-0.5">{TYPE_ICONS[card.type]?.icon}</span>
                    <p className="text-[10px] text-white/75 leading-tight font-medium">{card.label}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] px-1 py-0.5 rounded font-semibold"
                      style={{ background: card.pcolor + '20', color: card.pcolor }}>
                      {card.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Features ──────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: LayoutGrid,
    color: '#0052CC',
    bg: '#DEEBFF',
    title: 'Kanban Board',
    desc: 'Visualize work across To Do, In Progress, Review, and Done. Drag, filter, and update in real time.',
  },
  {
    icon: Rocket,
    color: '#6554C0',
    bg: '#EAE6FF',
    title: 'Sprint Planning',
    desc: 'Create sprints, set goals, track velocity. Move issues in and out of sprints with one click.',
  },
  {
    icon: Bug,
    color: '#DE350B',
    bg: '#FFEBE6',
    title: 'Issue Tracking',
    desc: 'Track Epics, Stories, Tasks, and Bugs — each with priority, status, assignee, and sprint.',
  },
  {
    icon: Sparkles,
    color: '#FF8B00',
    bg: '#FFFAE6',
    title: 'Feature Roadmap',
    desc: 'Manage feature requests and backlog items. Keep stakeholders aligned on whats coming next.',
  },
  {
    icon: MessageSquare,
    color: '#00B8D9',
    bg: '#E6FCFF',
    title: 'Team Chat',
    desc: 'Real-time messaging in project channels. Share invite links so your team joins instantly.',
  },
  {
    icon: Users,
    color: '#36B37E',
    bg: '#E3FCEF',
    title: 'Project Members',
    desc: 'Invite teammates via email or shareable link. Each project is scoped — only members can see it.',
  },
]

// ── How it works ──────────────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    title: 'Create your project',
    desc: 'Set up a project in seconds — name it, pick a color, and start right away. No credit card needed.',
  },
  {
    num: '02',
    title: 'Invite your team',
    desc: 'Share an invite link or send email invites. Only people you add can see your project.',
  },
  {
    num: '03',
    title: 'Track and ship',
    desc: 'Create issues, plan sprints, review progress on the board, and ship great software together.',
  },
]

// ── Main component ────────────────────────────────────────────────
export default function LandingPage() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)

  function open(mode: AuthMode) { setAuthMode(mode) }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0E1A', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 flex items-center px-6 md:px-10 h-14"
        style={{ background: 'rgba(10,14,26,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-10">
          <div className="w-8 h-8 rounded-xl bg-[#0052CC] flex items-center justify-center shadow-lg shadow-blue-900/50">
            <ArrowheadIcon className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-white text-lg font-black tracking-tight">sethu</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6">
          {['Features', 'Pricing', 'Changelog'].map(l => (
            <a key={l} href="#" className="text-sm font-medium transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'white'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'}>
              {l}
            </a>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button onClick={() => open('login')}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'white'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}>
            Sign in
          </button>
          <button onClick={() => open('register')}
            className="px-4 py-1.5 text-sm font-bold rounded-lg text-white transition-all shadow-lg shadow-blue-900/40"
            style={{ background: '#0052CC' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0065FF'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0052CC'}>
            Get started free
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-20 pb-16 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, #0052CC 0%, transparent 70%)', filter: 'blur(60px)' }} />

        {/* Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full mb-6 relative z-10"
          style={{ background: 'rgba(0,82,204,0.15)', border: '1px solid rgba(0,82,204,0.3)' }}>
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-blue-400">Built for engineering teams</span>
        </div>

        {/* Headline */}
        <h1 className="relative z-10 text-4xl md:text-6xl font-black tracking-tight leading-[1.08] mb-5 max-w-3xl">
          <span className="text-white">Plan. Build. </span>
          <span style={{
            background: 'linear-gradient(135deg, #4C9AFF 0%, #0052CC 50%, #6554C0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Ship.</span>
        </h1>

        <p className="relative z-10 text-lg md:text-xl max-w-xl mb-8 leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.55)' }}>
          The project management platform your engineering team actually wants to use.
          Jira-level power, zero complexity.
        </p>

        {/* CTAs */}
        <div className="relative z-10 flex items-center gap-3 mb-14">
          <button onClick={() => open('register')}
            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-xl shadow-blue-900/40"
            style={{ background: 'linear-gradient(135deg, #0065FF, #0052CC)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
            Start for free
            <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => open('login')}
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all"
            style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'white' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)' }}>
            Sign in
          </button>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex items-center gap-6 mb-12">
          {[['10k+', 'Issues tracked'], ['500+', 'Teams'], ['99.9%', 'Uptime']].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-xl font-black text-white">{n}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Kanban preview */}
        <div className="relative z-10 w-full max-w-4xl">
          <KanbanPreview />
          {/* Fade at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, #0A0E1A)' }} />
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ background: '#F8F9FC' }} className="px-6 md:px-10 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-[#172B4D] mb-3">
              Everything you need to ship great software
            </h2>
            <p className="text-[#5E6C84] text-lg max-w-xl mx-auto">
              All the tools your team needs in one workspace — no integrations, no tab-switching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                style={{ border: '1px solid #E8EAED' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="text-base font-bold text-[#172B4D] mb-1.5">{title}</h3>
                <p className="text-sm text-[#5E6C84] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Issue Types section ── */}
      <section style={{ background: '#0A0E1A' }} className="px-6 md:px-10 py-20">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Every type of work, in one place
            </h2>
            <p className="text-[rgba(255,255,255,0.55)] text-lg mb-8 leading-relaxed">
              From high-level Epics down to individual bugs — track everything your team works on.
            </p>
            <div className="space-y-3">
              {[
                { type: 'epic', label: 'Epics', desc: 'Large bodies of work spanning multiple sprints' },
                { type: 'story', label: 'Stories', desc: 'User-centric features broken into deliverables' },
                { type: 'task', label: 'Tasks', desc: 'Specific work items assigned to team members' },
                { type: 'bug', label: 'Bugs', desc: 'Defects and issues found in production' },
              ].map(({ type, label, desc }) => (
                <div key={type} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-lg w-8 text-center">{TYPE_ICONS[type]?.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-white">{label}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{desc}</div>
                  </div>
                  <CheckCircle className="ml-auto w-4 h-4 flex-shrink-0" style={{ color: '#36B37E' }} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full max-w-md">
            <div className="rounded-2xl overflow-hidden"
              style={{ background: '#161A1E', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <span className="text-sm font-bold text-white">Sprint 4 — Issues</span>
                <span className="text-xs px-2 py-0.5 rounded font-semibold"
                  style={{ background: '#0052CC20', color: '#4C9AFF' }}>Active</span>
              </div>
              <div className="p-3 space-y-2">
                {[
                  { key: 'MOB-12', type: 'epic', title: 'Mobile onboarding v2', p: 'high', s: 'in_progress' },
                  { key: 'MOB-13', type: 'story', title: 'Welcome screen animation', p: 'medium', s: 'review' },
                  { key: 'MOB-14', type: 'task', title: 'API integration setup', p: 'high', s: 'in_progress' },
                  { key: 'MOB-15', type: 'bug', title: 'Crash on back navigation', p: 'critical', s: 'todo' },
                  { key: 'MOB-16', type: 'task', title: 'Analytics event tracking', p: 'low', s: 'done' },
                ].map(row => (
                  <div key={row.key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-sm w-5 text-center">{TYPE_ICONS[row.type]?.icon}</span>
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{row.key}</span>
                    <span className="text-xs text-white/70 flex-1 truncate">{row.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                      style={{
                        background: row.s === 'done' ? '#36B37E20' : row.s === 'in_progress' ? '#0052CC20' : row.s === 'review' ? '#6554C020' : '#DFE1E620',
                        color: row.s === 'done' ? '#36B37E' : row.s === 'in_progress' ? '#4C9AFF' : row.s === 'review' ? '#8777D9' : '#7A869A',
                      }}>
                      {row.s === 'in_progress' ? 'In Progress' : row.s.charAt(0).toUpperCase() + row.s.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: '#F8F9FC' }} className="px-6 md:px-10 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-[#172B4D] mb-3">Up and running in minutes</h2>
            <p className="text-[#5E6C84] text-lg">No onboarding sessions, no setup fees. Just create and go.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-[#0052CC] mx-auto mb-4"
                  style={{ background: '#DEEBFF' }}>
                  {num}
                </div>
                <h3 className="text-base font-bold text-[#172B4D] mb-2">{title}</h3>
                <p className="text-sm text-[#5E6C84] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial / Social proof ── */}
      <section style={{ background: '#0A0E1A' }} className="px-6 md:px-10 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <blockquote className="text-xl md:text-2xl font-bold text-white mb-4 leading-snug">
            "Finally a project management tool that doesn't feel like work to use.
            Our team shipped twice as fast after switching."
          </blockquote>
          <div className="flex items-center justify-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#0052CC] text-white text-sm font-bold flex items-center justify-center">S</div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white">Sarah K.</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Engineering Lead</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="px-6 md:px-10 py-20"
        style={{ background: 'linear-gradient(135deg, #0052CC 0%, #6554C0 100%)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Ready to ship faster?
          </h2>
          <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Create your free workspace and invite your team in under 2 minutes.
          </p>
          <button onClick={() => open('register')}
            className="flex items-center gap-2 px-8 py-3.5 text-base font-bold bg-white text-[#0052CC] rounded-xl mx-auto transition-all hover:shadow-2xl hover:-translate-y-0.5">
            Create free workspace
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.5)' }}>No credit card required · Free forever for small teams</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 md:px-10 py-10 border-t"
        style={{ background: '#060A14', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0052CC] flex items-center justify-center">
              <ArrowheadIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-black">sethu</span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} Sethu. Built for teams who ship.
          </p>
          <div className="flex items-center gap-4">
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

      {/* Auth Modal */}
      {authMode && <AuthModal defaultMode={authMode} onClose={() => setAuthMode(null)} />}
    </div>
  )
}
