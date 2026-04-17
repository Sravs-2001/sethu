'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  LayoutGrid, Bug, Sparkles, MessageSquare, Users,
  ArrowRight, BarChart2, Lock,
  CheckCircle, Layers, Shield, Zap,
  Target, TrendingUp,
} from 'lucide-react'
import AuthModal from './AuthModal'
import JiraLogo from '@/components/ui/JiraLogo'

type AuthMode = 'login' | 'register'

// ── Scroll reveal hook ────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ── Count-up hook ─────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400, active = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    let start: number
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(Math.floor(p * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])
  return val
}

// ── Board preview ─────────────────────────────────────────────────
const COLS = [
  { title: 'To Do',       color: '#6B7280', items: [{ label: 'Login crash on iOS', pt: 'Critical', pc: '#EF4444' }, { label: 'Dark mode toggle', pt: 'Medium', pc: '#6B7280' }] },
  { title: 'In Progress', color: '#3B82F6', items: [{ label: 'API rate limiting', pt: 'High', pc: '#F59E0B' }, { label: 'Analytics v2', pt: 'Medium', pc: '#3B82F6' }] },
  { title: 'Review',      color: '#8B5CF6', items: [{ label: 'CSV export', pt: 'Low', pc: '#10B981' }] },
  { title: 'Done',        color: '#10B981', items: [{ label: 'OAuth integration', pt: 'Low', pc: '#10B981' }] },
]

function BoardPreview() {
  return (
    <div className="lp-float relative">
      <div className="absolute -inset-4 rounded-3xl opacity-30" style={{ background: 'radial-gradient(ellipse at 50% 50%, #2684FF33, transparent 70%)' }} />
      <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-2xl">
        {/* Topbar */}
        <div className="flex items-center gap-2 px-4 h-11 border-b border-gray-100 bg-white">
          <JiraLogo size={22} />
          <div className="flex-1 min-w-0">
            <span className="text-gray-900 text-[11px] font-bold">sethu</span>
            <span className="text-gray-400 text-[9px] ml-1">/ Mobile App</span>
          </div>
          <div className="flex -space-x-1.5">
            {['S','A','K'].map((l,i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[8px] font-bold flex items-center justify-center border-2 border-white">{l}</div>
            ))}
          </div>
          <div className="px-2 py-0.5 rounded text-[9px] font-semibold text-white bg-gray-900 ml-1">+ New</div>
        </div>
        {/* Body */}
        <div className="flex bg-gray-50/80" style={{ minHeight: 180 }}>
          {/* Sidebar */}
          <div className="w-20 border-r border-gray-100 py-2.5 bg-white flex-shrink-0">
            {['Summary','Board','Backlog','Issues','Features'].map((item,i) => (
              <div key={item} className={`px-2.5 py-1 mx-1.5 mb-0.5 rounded text-[9px] font-medium ${i===1 ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-400'}`}>
                {item}
              </div>
            ))}
          </div>
          {/* Columns */}
          <div className="flex-1 grid grid-cols-4 gap-2 p-2.5">
            {COLS.map(col => (
              <div key={col.title} className="rounded-lg p-2 bg-white border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                  <span className="text-[8px] font-bold text-gray-600 uppercase tracking-wide">{col.title}</span>
                  <span className="ml-auto text-[8px] bg-gray-100 text-gray-500 px-1 rounded-full">{col.items.length}</span>
                </div>
                <div className="space-y-1">
                  {col.items.map((item,i) => (
                    <div key={i} className="bg-gray-50 rounded p-1.5 border border-gray-100">
                      <p className="text-[8px] text-gray-700 font-medium leading-snug mb-1">{item.label}</p>
                      <span className="text-[7px] px-1 py-0.5 rounded-full font-semibold" style={{ background: item.pc+'18', color: item.pc }}>{item.pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Feature cards ─────────────────────────────────────────────────
const FEATURES = [
  { icon: LayoutGrid,    title: 'Kanban Board',    desc: 'Board + list view. Filter by type, priority, assignee. Real-time updates.',  color: '#3B82F6', bg: '#EFF6FF' },
  { icon: Layers,        title: 'Sprint Backlog',  desc: 'Plan sprints with goals and dates. Track velocity across completed sprints.', color: '#8B5CF6', bg: '#F5F3FF' },
  { icon: Bug,           title: 'Issue Tracking',  desc: 'Epics, Stories, Tasks, Bugs — each with priority, status, assignee, sprint.', color: '#EF4444', bg: '#FEF2F2' },
  { icon: Sparkles,      title: 'Feature Roadmap', desc: 'Manage feature requests separately. Grouped by status, linked to sprints.',  color: '#F59E0B', bg: '#FFFBEB' },
  { icon: BarChart2,     title: 'Reports',         desc: 'Priority breakdown, status distribution, sprint velocity, team workload.',    color: '#10B981', bg: '#ECFDF5' },
  { icon: Lock,          title: 'Private Projects',desc: 'Invite-only access. No one outside your list can view or join.',              color: '#6B7280', bg: '#F9FAFB' },
  { icon: MessageSquare, title: 'Team Chat',       desc: 'Real-time channels per project. Invite teammates with a shareable link.',     color: '#6366F1', bg: '#EEF2FF' },
  { icon: Users,         title: 'Role Control',    desc: 'Admins get Reports + Settings. Members get everything else.',                 color: '#0EA5E9', bg: '#F0F9FF' },
]

// ── Ticker items ──────────────────────────────────────────────────
const TICKER_ITEMS = [
  'Kanban Boards', 'Sprint Planning', 'Bug Tracking', 'Team Chat',
  'Feature Roadmap', 'Real-time Updates', 'Role Permissions', 'Analytics',
  'Invite Links', 'Private Projects', 'Backlog Management', 'Velocity Charts',
]

// ── Stats ─────────────────────────────────────────────────────────
function StatCard({ num, suffix = '', label, active }: { num: number; suffix?: string; label: string; active: boolean }) {
  const val = useCountUp(num, 1200, active)
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-black text-gray-900 tabular-nums">{val}{suffix}</div>
      <div className="text-sm text-gray-500 font-medium mt-1">{label}</div>
    </div>
  )
}

// ── Main landing page ─────────────────────────────────────────────
export default function LandingPage() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite_token') ?? undefined

  useEffect(() => { if (inviteToken) setAuthMode('register') }, [inviteToken])

  const features = useInView()
  const stats    = useInView()
  const steps    = useInView()
  const roles    = useInView()
  const cta      = useInView()

  return (
    <>
      {/* ── Global keyframes ── */}
      <style>{`
        @keyframes lp-fade-up   { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes lp-fade-in   { from { opacity:0 } to { opacity:1 } }
        @keyframes lp-float     { 0%,100% { transform:translateY(0px) } 50% { transform:translateY(-8px) } }
        @keyframes lp-shimmer   { 0% { background-position:200% center } 100% { background-position:-200% center } }
        @keyframes lp-dot-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes lp-ticker    { from { transform:translateX(0) } to { transform:translateX(-50%) } }
        .lp-fade-up   { animation: lp-fade-up  0.55s ease both }
        .lp-fade-in   { animation: lp-fade-in  0.5s ease both }
        .lp-float     { animation: lp-float 5s ease-in-out infinite }
        .lp-ticker-track { animation: lp-ticker 28s linear infinite }
        .lp-ticker-track:hover { animation-play-state: paused }
        .lp-shimmer-text {
          background: linear-gradient(90deg, #111 0%, #555 40%, #111 60%, #555 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: lp-shimmer 4s linear infinite;
        }
        .lp-card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .lp-card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 32px rgba(0,0,0,0.09);
          border-color: #d1d5db;
        }
        .lp-dot-grid {
          background-image: radial-gradient(circle, #d1d5db 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .lp-stagger-1 { animation-delay: 0.04s }
        .lp-stagger-2 { animation-delay: 0.10s }
        .lp-stagger-3 { animation-delay: 0.16s }
        .lp-stagger-4 { animation-delay: 0.22s }
        .lp-stagger-5 { animation-delay: 0.28s }
        .lp-stagger-6 { animation-delay: 0.34s }
        .lp-stagger-7 { animation-delay: 0.40s }
        .lp-stagger-8 { animation-delay: 0.46s }
        .lp-btn-glow:hover {
          box-shadow: 0 0 0 3px rgba(0,0,0,0.08), 0 4px 14px rgba(0,0,0,0.16);
        }
        .lp-step-ghost {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 80px;
          font-weight: 900;
          color: #f3f4f6;
          line-height: 1;
          pointer-events: none;
          user-select: none;
          z-index: 0;
        }
      `}</style>

      <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">

        {/* ── Background dot grid ── */}
        <div className="fixed inset-0 lp-dot-grid opacity-40 pointer-events-none" />
        <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0) 0%, white 70%)' }} />

        {/* ── Navbar ── */}
        <nav className="sticky top-0 z-50 flex items-center justify-between px-6 h-14 bg-white/80 border-b border-gray-100 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <JiraLogo size={28} />
            <span className="sethu-brand text-gray-900 text-base">sethu</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {['Features','How it works'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`}
                className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50">
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAuthMode('login')}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </button>
            <button onClick={() => setAuthMode('register')}
              className="lp-btn-glow px-4 py-1.5 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all">
              Get started
            </button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="relative px-6 pt-16 pb-10 md:pt-20 md:pb-14">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10">

            {/* Left */}
            <div className="flex-1 text-center lg:text-left">
              <div className="lp-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-50 border border-gray-200 mb-5">
                <span className="w-2 h-2 rounded-full bg-green-500" style={{ animation: 'lp-dot-pulse 2s ease-in-out infinite' }} />
                <span className="text-gray-600">Now available · free for small teams</span>
              </div>

              <h1 className="lp-fade-up lp-stagger-1 text-5xl md:text-[4.2rem] font-black text-gray-900 leading-[1.05] tracking-tight mb-5">
                Project management<br />
                <span className="lp-shimmer-text">reimagined.</span>
              </h1>

              <p className="lp-fade-up lp-stagger-2 text-base text-gray-500 leading-relaxed mb-7 max-w-lg mx-auto lg:mx-0">
                Beautiful boards, intelligent sprints, seamless collaboration.
                The workspace your team will actually love using.
              </p>

              <div className="lp-fade-up lp-stagger-3 flex items-center justify-center lg:justify-start gap-3 mb-8">
                <button onClick={() => setAuthMode('register')}
                  className="lp-btn-glow group flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-all">
                  Start for free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => setAuthMode('login')}
                  className="px-7 py-3 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all">
                  Sign in
                </button>
              </div>

              <div className="lp-fade-up lp-stagger-4 flex items-center justify-center lg:justify-start gap-8">
                {[['10k+','Issues tracked'],['500+','Teams'],['99.9%','Uptime']].map(([n,l]) => (
                  <div key={l} className="text-center lg:text-left">
                    <div className="text-xl font-black text-gray-900">{n}</div>
                    <div className="text-xs text-gray-400 font-medium mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — floating board */}
            <div className="lp-fade-in lp-stagger-2 flex-1 w-full max-w-2xl">
              <BoardPreview />
            </div>
          </div>
        </section>

        {/* ── Scrolling Ticker ── */}
        <div className="relative overflow-hidden border-y border-gray-100 bg-gray-50 py-3 select-none">
          <div className="lp-ticker-track flex gap-0 w-max">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-5 whitespace-nowrap">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{item}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Features ── */}
        <section id="features" className="relative px-6 py-14" ref={features.ref}>
          <div className="max-w-7xl mx-auto">
            <div className={`text-center mb-10 ${features.visible ? 'lp-fade-up' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 mb-4">
                <Sparkles className="w-3 h-3" /> Powerful Features
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Everything you need to ship</h2>
              <p className="text-base text-gray-500">One beautiful workspace. Infinite possibilities.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
                <div key={title}
                  className={`lp-card-hover rounded-2xl p-5 border border-gray-100 shadow-sm bg-white ${features.visible ? `lp-fade-up lp-stagger-${Math.min(i+1,8)}` : 'opacity-0'}`}
                  style={{ borderTop: `3px solid ${color}22` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-1.5">{title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="relative px-6 py-10 bg-gray-50 border-y border-gray-100" ref={stats.ref}>
          <div className="max-w-5xl mx-auto">
            <div className={`rounded-2xl overflow-hidden ${stats.visible ? 'lp-fade-up' : 'opacity-0'}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-gray-200 divide-y md:divide-y-0">
                {[
                  { num: 99, suffix: '.9%', label: 'Uptime SLA' },
                  { num: 256, suffix: '-bit', label: 'Encryption' },
                  { num: 24, suffix: '/7', label: 'Support' },
                  { num: 100, suffix: '%', label: 'Private' },
                ].map(({ num, suffix, label }) => (
                  <div key={label} className="py-8 px-6 text-center bg-white">
                    <StatCard num={num} suffix={suffix} label={label} active={stats.visible} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="relative px-6 py-14" ref={steps.ref}>
          <div className="max-w-4xl mx-auto">
            <div className={`text-center mb-10 ${steps.visible ? 'lp-fade-up' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 mb-4">
                <Zap className="w-3 h-3" /> Lightning Fast
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Up and running in minutes</h2>
              <p className="text-base text-gray-500">No setup. No credit card. Just productivity.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 relative">
              {/* Connector line (desktop) */}
              <div className="hidden md:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gray-200 z-0" />

              {[
                { num: '01', icon: Target,     title: 'Create',  desc: 'Name your project and get a beautiful workspace instantly.' },
                { num: '02', icon: Users,       title: 'Invite',  desc: 'Share a link with your team. Private by default, always.' },
                { num: '03', icon: TrendingUp,  title: 'Ship',    desc: 'Track issues, plan sprints, and deliver faster than ever.' },
              ].map(({ num, icon: Icon, title, desc }, i) => (
                <div key={num} className={`relative z-10 text-center pt-4 ${steps.visible ? `lp-fade-up lp-stagger-${i+1}` : 'opacity-0'}`}>
                  <span className="lp-step-ghost">{num}</span>
                  <div className="relative z-10 w-14 h-14 rounded-2xl bg-white border-2 border-gray-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Icon className="w-6 h-6 text-gray-800" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1.5">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Roles ── */}
        <section className="relative px-6 py-14 bg-gray-50 border-t border-gray-100" ref={roles.ref}>
          <div className="max-w-5xl mx-auto">
            <div className={`text-center mb-10 ${roles.visible ? 'lp-fade-up' : 'opacity-0'}`}>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Built for modern teams</h2>
              <p className="text-base text-gray-500">Clear roles. Powerful permissions. Total control.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: Shield, title: 'Admin', desc: 'Full control over your workspace with powerful management tools.',
                  perks: ['Full project access','Analytics & reports','Team management','Advanced settings'],
                  color: '#111', bg: '#f3f4f6',
                },
                {
                  icon: Users, title: 'Member', desc: 'Everything you need to collaborate and ship great work.',
                  perks: ['Create & track issues','Sprint planning','Team chat','Board views'],
                  color: '#374151', bg: '#f9fafb',
                },
                {
                  icon: Lock, title: 'Private', desc: 'Your data stays with your team. Always secure, always private.',
                  perks: ['Invite-only access','Encrypted data','Isolated projects','GDPR compliant'],
                  color: '#6B7280', bg: '#f9fafb',
                },
              ].map(({ icon: Icon, title, desc, perks, color, bg }, i) => (
                <div key={title}
                  className={`lp-card-hover bg-white rounded-2xl p-6 border border-gray-100 shadow-sm ${roles.visible ? `lp-fade-up lp-stagger-${i+1}` : 'opacity-0'}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1.5">{title}</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">{desc}</p>
                  <div className="space-y-2">
                    {perks.map(t => (
                      <div key={t} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative px-6 py-14" ref={cta.ref}>
          <div className="max-w-4xl mx-auto">
            <div className={`relative overflow-hidden rounded-3xl bg-gray-900 p-10 md:p-14 text-center ${cta.visible ? 'lp-fade-up' : 'opacity-0'}`}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -10%, rgba(255,255,255,0.07), transparent)' }} />
              <div className="absolute inset-0 lp-dot-grid opacity-10 pointer-events-none" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white/70 border border-white/10 mb-5">
                  <Sparkles className="w-3 h-3" /> Free forever for small teams
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
                  Ready to transform<br />your workflow?
                </h2>
                <p className="text-gray-400 text-base mb-8 max-w-sm mx-auto">
                  Join teams already shipping faster with sethu.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => setAuthMode('register')}
                    className="lp-btn-glow group flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-gray-900 bg-white hover:bg-gray-100 transition-all">
                    Create free workspace
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button onClick={() => setAuthMode('login')}
                    className="px-7 py-3 rounded-xl text-sm font-semibold text-white/80 border border-white/20 hover:bg-white/10 transition-all">
                    Sign in
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="relative px-6 py-6 border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <JiraLogo size={22} />
              <span className="sethu-brand text-gray-900 text-sm">sethu</span>
            </div>
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} Sethu. Built for teams who ship.</p>
            <div className="flex items-center gap-5">
              {['Privacy','Terms','Support'].map(l => (
                <a key={l} href="#" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {authMode && (
        <AuthModal
          defaultMode={authMode}
          inviteToken={inviteToken}
          onClose={() => setAuthMode(null)}
        />
      )}
    </>
  )
}
