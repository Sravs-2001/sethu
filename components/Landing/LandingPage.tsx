'use client'

import { useState, useEffect } from 'react'
import {
  Bug, Sparkles, Rocket, MessageSquare, Users, BarChart3,
  Star, CheckCircle, Github, Twitter, Linkedin, Menu, X as XIcon,
} from 'lucide-react'
import ArrowheadIcon from '@/components/ui/ArrowheadIcon'
import AuthModal from './AuthModal'

type AuthMode = 'login' | 'register'

const ROUTE_MAP: Record<string, string> = {
  hero:           '/',
  features:       '/features',
  'how-it-works': '/how-it-works',
  about:          '/about',
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function useScrollUrl() {
  useEffect(() => {
    const path = window.location.pathname
    const sectionId = Object.entries(ROUTE_MAP).find(([, p]) => p === path)?.[0]
    if (sectionId && sectionId !== 'hero') {
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
      }, 120)
    }
  }, [])

  useEffect(() => {
    const ids = Object.keys(ROUTE_MAP)
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const path = ROUTE_MAP[e.target.id] ?? '/'
            window.history.replaceState(null, '', path)
          }
        })
      },
      { threshold: 0.45 }
    )
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])
}

function BugPreview() {
  const bugs = [
    { label: 'Login crash on iOS 16',    priority: 'critical', status: 'in_progress', color: 'bg-red-500' },
    { label: 'Chart not loading Firefox', priority: 'high',     status: 'review',      color: 'bg-orange-500' },
    { label: 'CSV export missing offset', priority: 'medium',   status: 'todo',        color: 'bg-yellow-500' },
    { label: 'Tooltip flicker on hover',  priority: 'low',      status: 'done',        color: 'bg-green-500' },
  ]
  return (
    <div className="space-y-2 mt-4">
      {bugs.map((b, i) => (
        <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/8 hover:bg-white/10 transition-colors">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${b.color}`} />
          <span className="text-white/80 text-xs flex-1 truncate font-medium">{b.label}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            b.status === 'done'        ? 'bg-green-500/20 text-green-400'  :
            b.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400'   :
            b.status === 'review'      ? 'bg-purple-500/20 text-purple-400':
                                         'bg-white/10 text-white/50'
          }`}>
            {b.status === 'in_progress' ? 'In Progress' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
          </span>
        </div>
      ))}
    </div>
  )
}

function ChatPreview() {
  const msgs = [
    { user: 'A', msg: 'Safari crash is critical, assigned to me', mine: false },
    { user: 'Y', msg: 'On it! Will have a fix by 2pm',            mine: true  },
    { user: 'B', msg: 'Added to Sprint 3 board',                  mine: false },
  ]
  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center gap-2 text-xs text-white/40 font-semibold uppercase tracking-widest mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        # bugs
      </div>
      {msgs.map((m, i) => (
        <div key={i} className={`flex gap-2.5 ${m.mine ? 'flex-row-reverse' : ''}`}>
          <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${m.mine ? 'bg-blue-500' : 'bg-white/20'}`}>{m.user}</div>
          <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs font-medium ${m.mine ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white/10 text-white/80 rounded-tl-sm'}`}>
            {m.msg}
          </div>
        </div>
      ))}
    </div>
  )
}

function SprintPreview() {
  const cols = [
    { label: 'To Do',       count: 3, color: 'bg-white/10',      items: ['Auth redesign', 'API rate limit', 'Dark mode'] },
    { label: 'In Progress', count: 2, color: 'bg-blue-500/15',   items: ['Safari fix', 'CSV export'] },
    { label: 'Done',        count: 4, color: 'bg-green-500/10',  items: ['Dashboard','Login','Charts','Tests'] },
  ]
  return (
    <div className="flex gap-2 mt-4">
      {cols.map(col => (
        <div key={col.label} className={`flex-1 ${col.color} rounded-xl p-2.5 border border-white/8`}>
          <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">{col.label} · {col.count}</div>
          <div className="space-y-1.5">
            {col.items.map(item => (
              <div key={item} className="bg-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/70 font-medium truncate">{item}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DashboardPreview() {
  const stats = [{ l:'Open Bugs',n:'12',c:'text-red-400' },{ l:'Critical',n:'3',c:'text-orange-400' },{ l:'In Progress',n:'7',c:'text-blue-400' },{ l:'Resolved',n:'41',c:'text-green-400' }]
  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {stats.map(s => (
          <div key={s.l} className="bg-white/5 border border-white/8 rounded-xl p-3">
            <div className={`text-xl font-black ${s.c}`}>{s.n}</div>
            <div className="text-[10px] text-white/40 mt-0.5 font-medium">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="bg-white/5 border border-white/8 rounded-xl p-3">
        <div className="text-[10px] text-white/40 font-semibold mb-2">Sprint Progress · 64%</div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full" style={{ width: '64%' }} />
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [modal, setModal] = useState<AuthMode | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useReveal()
  useScrollUrl()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    window.history.replaceState(null, '', ROUTE_MAP[id] ?? '/')
    setMobileOpen(false)
  }

  const NAV = ['Features', 'How it works', 'About']

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* NAVBAR */}
      <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 group">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${scrolled ? 'bg-blue-600' : 'bg-white/15 border border-white/25'}`}>
              <ArrowheadIcon className="w-4 h-4 text-white" />
            </div>
            <span className={`text-[18px] font-black tracking-tight ${scrolled ? 'text-gray-900' : 'text-white'}`}>sethu</span>
          </button>

          <nav className="hidden md:flex items-center gap-0.5">
            {NAV.map(l => (
              <button key={l} onClick={() => go(l.toLowerCase().replace(' ', '-'))}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${scrolled ? 'text-gray-600 hover:text-blue-600 hover:bg-blue-50' : 'text-white/75 hover:text-white hover:bg-white/10'}`}>
                {l}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => setModal('login')}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
              Sign in
            </button>
            <button onClick={() => setModal('register')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all active:scale-95 ${scrolled ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-white text-blue-700 hover:bg-blue-50 shadow-md'}`}>
              Get started <ArrowheadIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">
            {mobileOpen ? <XIcon className={`w-5 h-5 ${scrolled ? 'text-gray-900' : 'text-white'}`} /> : <Menu className={`w-5 h-5 ${scrolled ? 'text-gray-900' : 'text-white'}`} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-xl px-6 py-4 space-y-1 animate-slide-in">
            {NAV.map(l => (
              <button key={l} onClick={() => go(l.toLowerCase().replace(' ', '-'))}
                className="w-full text-left px-4 py-3 text-gray-700 font-medium hover:bg-blue-50 hover:text-blue-600 rounded-xl">{l}</button>
            ))}
            <div className="pt-3 space-y-2">
              <button onClick={() => { setModal('login'); setMobileOpen(false) }} className="w-full py-3 border-2 border-blue-600 text-blue-600 font-bold rounded-xl">Sign in</button>
              <button onClick={() => { setModal('register'); setMobileOpen(false) }} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">Get started free</button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-0 overflow-hidden noise"
        style={{ background: 'linear-gradient(160deg, #060d1f 0%, #0a1628 40%, #0d1f3c 100%)' }}>
        <div className="dot-grid absolute inset-0 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.22) 0%, transparent 70%)' }} />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2.5 bg-white/8 border border-white/12 rounded-full px-5 py-2 mb-10 animate-slide-in">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-ring" />
            <span className="text-white/65 text-sm font-medium">Free forever · Real-time · No credit card</span>
          </div>

          <h1 className="text-[clamp(52px,9vw,112px)] font-black leading-[0.92] tracking-tighter text-white mb-8 animate-slide-in">
            Track. Build.<br />
            <span className="gradient-text">Ship together.</span>
          </h1>

          <p className="text-[clamp(16px,2vw,22px)] text-white/45 max-w-2xl mx-auto mb-10 leading-relaxed font-light animate-slide-in">
            Bugs, features, sprints, and team chat — unified in one workspace.
            No more switching between Jira, Slack, and Trello.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16 animate-slide-in">
            <button onClick={() => setModal('register')}
              className="flex items-center gap-2.5 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-[17px] font-black rounded-2xl shadow-2xl shadow-blue-900/60 hover:-translate-y-0.5 transition-all duration-150 active:scale-95">
              Start for free <ArrowheadIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setModal('login')}
              className="flex items-center gap-2.5 px-8 py-4 border border-white/15 text-white/70 text-[17px] font-semibold rounded-2xl hover:bg-white/6 hover:text-white transition-all">
              Sign in →
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-10 mb-16">
            {[['10k+','Bugs resolved'],['500+','Teams'],['4-in-1','Tools replaced'],['Free','Always']].map(([n, l]) => (
              <div key={l} className="text-center">
                <div className="text-4xl font-black text-white mb-1">{n}</div>
                <div className="text-sm text-white/30">{l}</div>
              </div>
            ))}
          </div>

          <div className="glow-border rounded-3xl p-1 shadow-2xl shadow-blue-900/40 animate-float mx-auto max-w-3xl">
            <div className="bg-[#080f1f] rounded-[22px] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6 bg-white/3">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
                <div className="flex-1 mx-4 bg-white/6 border border-white/8 rounded-lg h-6 flex items-center px-3">
                  <span className="text-white/25 text-[11px]">app.sethu.io/dashboard</span>
                </div>
              </div>
              <div className="flex h-64">
                <div className="w-12 bg-white/3 border-r border-white/6 flex flex-col items-center py-3 gap-2">
                  <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center"><ArrowheadIcon className="w-3.5 h-3.5 text-white" /></div>
                  {[BarChart3, Bug, Sparkles, Rocket].map((Icon, i) => (
                    <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-white/15' : ''}`}>
                      <Icon className={`w-3.5 h-3.5 ${i === 0 ? 'text-blue-400' : 'text-white/20'}`} />
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-4">
                  <div className="text-white/60 text-xs font-bold mb-3">DASHBOARD</div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[['12','Open'],['3','Critical'],['7','Active'],['41','Done']].map(([n,l]) => (
                      <div key={l} className="bg-white/5 rounded-xl p-2 border border-white/6">
                        <div className="text-white font-black text-lg">{n}</div>
                        <div className="text-white/30 text-[10px]">{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { t: 'Login crash on iOS', p: 'critical', c: 'bg-red-500' },
                      { t: 'Dark mode support', p: 'high', c: 'bg-orange-500' },
                      { t: 'Export CSV feature', p: 'medium', c: 'bg-yellow-500' },
                    ].map((b, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-1.5 border border-white/6">
                        <span className={`w-1.5 h-1.5 rounded-full ${b.c}`} />
                        <span className="text-white/60 text-[11px] flex-1">{b.t}</span>
                        <span className="text-[10px] bg-white/8 text-white/30 px-2 py-0.5 rounded-md">{b.p}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-36 border-l border-white/6 p-3 flex flex-col">
                  <div className="text-[10px] text-white/30 font-bold mb-2"># general</div>
                  <div className="flex-1 space-y-2">
                    {[['A','Safari fix pushed!'],['B','Nice work!'],['Y','Merging now']].map(([u,m], i) => (
                      <div key={i} className={`flex gap-1.5 ${i === 2 ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black text-white ${i === 2 ? 'bg-blue-600' : 'bg-white/15'}`}>{u}</div>
                        <div className={`text-[10px] px-2 py-1 rounded-xl max-w-[80px] ${i === 2 ? 'bg-blue-600/80 text-white' : 'bg-white/8 text-white/50'}`}>{m}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white/6 border border-white/10 rounded-lg h-6 flex items-center px-2">
                    <span className="text-white/20 text-[10px]">Message...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full mt-16">
          <svg viewBox="0 0 1440 80" fill="white" preserveAspectRatio="none" style={{ display:'block', width:'100%', height:'80px' }}>
            <path d="M0,80 L0,40 C200,75 400,15 720,38 C1040,60 1280,18 1440,42 L1440,80 Z"/>
          </svg>
        </div>
      </section>

      {/* LOGOS */}
      <section className="py-10 border-b border-gray-100 overflow-hidden bg-white">
        <div className="section mb-5">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-300">Trusted by fast-moving teams</p>
        </div>
        <div className="flex animate-marquee whitespace-nowrap select-none">
          {['Acme Corp','Nexus Labs','Orbit Studio','Crest Digital','Vela Systems','Echo Works','Apex IO','Summit Co','Bright Layer','Nova Tech',
            'Acme Corp','Nexus Labs','Orbit Studio','Crest Digital','Vela Systems','Echo Works','Apex IO','Summit Co','Bright Layer','Nova Tech'].map((l, i) => (
            <span key={i} className="text-gray-200 text-sm font-black uppercase tracking-widest mx-12">{l}</span>
          ))}
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section id="features" className="py-28 bg-white">
        <div className="section">
          <div className="text-center mb-16 reveal">
            <p className="text-blue-600 text-xs font-black uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-[clamp(40px,6vw,72px)] font-black text-gray-900 leading-tight tracking-tighter">
              One workspace.<br /><span className="gradient-text-blue">Zero context-switching.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
            <div className="reveal lg:col-span-2 rounded-3xl p-7 overflow-hidden relative"
              style={{ background: 'linear-gradient(145deg, #0a1628 0%, #0d1f3c 100%)' }}>
              <div className="dot-grid absolute inset-0 opacity-60 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-10 h-10 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4"><Bug className="w-5 h-5 text-red-400" /></div>
                <h3 className="text-xl font-black text-white mb-1">Bug Tracker</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-2">Kanban board, priority levels, assignees, sprint links — all synced live.</p>
                <BugPreview />
              </div>
            </div>

            <div className="reveal reveal-delay-1 rounded-3xl p-7 overflow-hidden relative"
              style={{ background: 'linear-gradient(145deg, #0a1628 0%, #0d1f3c 100%)' }}>
              <div className="dot-grid absolute inset-0 opacity-60 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4"><MessageSquare className="w-5 h-5 text-indigo-400" /></div>
                <h3 className="text-xl font-black text-white mb-1">Team Chat</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-2">Real-time channels. Discuss bugs in context. No Slack needed.</p>
                <ChatPreview />
              </div>
            </div>

            <div className="reveal reveal-delay-2 rounded-3xl p-7 overflow-hidden relative"
              style={{ background: 'linear-gradient(145deg, #0a1628 0%, #0d1f3c 100%)' }}>
              <div className="dot-grid absolute inset-0 opacity-60 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-10 h-10 bg-sky-500/20 rounded-2xl flex items-center justify-center mb-4"><Rocket className="w-5 h-5 text-sky-400" /></div>
                <h3 className="text-xl font-black text-white mb-1">Sprint Boards</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-2">Plan, execute, and track sprints with visual Kanban columns.</p>
                <SprintPreview />
              </div>
            </div>

            <div className="reveal reveal-delay-3 rounded-3xl p-7 overflow-hidden relative"
              style={{ background: 'linear-gradient(145deg, #0a1628 0%, #0d1f3c 100%)' }}>
              <div className="dot-grid absolute inset-0 opacity-60 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4"><BarChart3 className="w-5 h-5 text-emerald-400" /></div>
                <h3 className="text-xl font-black text-white mb-1">Live Dashboard</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-2">Your project at a glance. Always real-time, always accurate.</p>
                <DashboardPreview />
              </div>
            </div>

            <div className="reveal reveal-delay-4 flex flex-col gap-4">
              <div className="flex-1 rounded-3xl p-7 bg-blue-600 text-white relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -right-4 -bottom-6 w-20 h-20 bg-white/8 rounded-full" />
                <div className="relative z-10">
                  <Sparkles className="w-8 h-8 text-blue-200 mb-3" />
                  <h3 className="text-lg font-black mb-1">Feature Planning</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">User stories, priorities, owners, and delivery tracking — all in one view.</p>
                </div>
              </div>
              <div className="flex-1 rounded-3xl p-7 bg-gray-900 text-white relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full" />
                <div className="relative z-10">
                  <Users className="w-8 h-8 text-gray-400 mb-3" />
                  <h3 className="text-lg font-black mb-1">Role-Based Access</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Admin &amp; member roles. First to register becomes Admin automatically.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-28" style={{ background: '#f7f8fc' }}>
        <div className="section">
          <div className="text-center mb-16 reveal">
            <p className="text-blue-600 text-xs font-black uppercase tracking-widest mb-3">Simple by design</p>
            <h2 className="text-[clamp(40px,6vw,72px)] font-black text-gray-900 leading-tight tracking-tighter">
              Up &amp; running<br />in minutes.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { n:'01', icon: CheckCircle,   col:'text-blue-500 bg-blue-50',        title:'Sign up free',    desc:'Create your account. First user becomes Admin. Team members can join instantly.' },
              { n:'02', icon: Rocket,        col:'text-sky-500 bg-sky-50',          title:'Create a sprint', desc:'Set a sprint goal, start and end dates. Pull bugs and features into your board.' },
              { n:'03', icon: MessageSquare, col:'text-indigo-500 bg-indigo-50',    title:'Collaborate',     desc:'Move cards, chat in channels, assign team members. Everything syncs live.' },
              { n:'04', icon: ArrowheadIcon, col:'text-emerald-500 bg-emerald-50',  title:'Ship it',         desc:'Close bugs, complete features, review your sprint dashboard. Repeat.' },
            ].map(({ n, icon: Icon, col, title, desc }, i) => (
              <div key={n} className={`reveal reveal-delay-${i} group bg-white rounded-3xl p-8 border border-gray-100 hover:border-blue-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300`}>
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-14 h-14 ${col} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="text-5xl font-black text-gray-100 group-hover:text-blue-100 transition-colors">{n}</span>
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-28 bg-white">
        <div className="section">
          <div className="text-center mb-16 reveal">
            <p className="text-blue-600 text-xs font-black uppercase tracking-widest mb-3">Real teams · Real results</p>
            <h2 className="text-[clamp(40px,6vw,72px)] font-black text-gray-900 leading-tight tracking-tighter">
              Loved by teams<br />who ship.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name:'Priya M.',  role:'Engineering Lead', quote:'Sethu replaced four tools for us. Our team went from scattered to focused in a single day.', stars:5 },
              { name:'Arjun K.',  role:'Product Manager',  quote:'The sprint board and team chat in one place is exactly what we needed. No more context switching.', stars:5 },
              { name:'Divya R.',  role:'Startup CTO',      quote:'Real-time chat and bug tracker together saved our sprint planning meetings entirely.', stars:5 },
            ].map(({ name, role, quote, stars }, i) => (
              <div key={name} className={`reveal reveal-delay-${i} group bg-white border border-gray-100 rounded-3xl p-8 hover:border-blue-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300`}>
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: stars }).map((_, j) => <Star key={j} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-800 text-lg font-medium leading-relaxed mb-8">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-6 border-t border-gray-50">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center">{name[0]}</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{name}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-28" style={{ background: '#f7f8fc' }}>
        <div className="section">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <p className="text-blue-600 text-xs font-black uppercase tracking-widest mb-4">Our mission</p>
              <h2 className="text-[clamp(36px,5vw,60px)] font-black text-gray-900 leading-tight tracking-tighter mb-6">
                Built for teams<br />who ship.
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-5">
                Sethu was born from the frustration of juggling Jira, Slack, Notion, and Trello simultaneously. Four apps. Four tabs. One team. Zero focus.
              </p>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                We built one workspace that does it all — <span className="text-gray-900 font-semibold">bug tracking, feature planning, sprint boards, and real-time chat</span>. Everything your engineering team needs, in a single tab.
              </p>
              <div className="flex flex-wrap gap-3">
                {['Free forever','Real-time sync','Role-based access','No tool switching'].map(t => (
                  <div key={t} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    <CheckCircle className="w-4 h-4 text-blue-500" /> {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal reveal-delay-2 grid grid-cols-2 gap-4">
              {[
                { icon: Bug,           title:'Bug Tracking',  val:'100%', note:'Visibility',      color:'text-red-500 bg-red-50' },
                { icon: Rocket,        title:'Sprint Boards', val:'4×',   note:'Faster delivery',  color:'text-blue-500 bg-blue-50' },
                { icon: MessageSquare, title:'Team Chat',     val:'0',    note:'Tool switching',   color:'text-indigo-500 bg-indigo-50' },
                { icon: BarChart3,     title:'Dashboard',     val:'Live', note:'Always updated',   color:'text-emerald-500 bg-emerald-50' },
              ].map(({ icon: Icon, title, val, note, color }) => (
                <div key={title} className="bg-white rounded-3xl p-6 border border-gray-100 hover:border-blue-100 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-3xl font-black text-gray-900 mb-0.5">{val}</div>
                  <div className="text-gray-400 text-xs font-semibold mb-2">{note}</div>
                  <div className="text-gray-600 text-sm font-medium">{title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-36 overflow-hidden noise"
        style={{ background: 'linear-gradient(160deg, #060d1f 0%, #0a1628 50%, #0d1f3c 100%)' }}>
        <div className="dot-grid absolute inset-0 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[400px]" style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.18) 0%, transparent 70%)' }} />
        </div>
        <div className="section relative z-10 text-center reveal">
          <p className="text-blue-400 text-xs font-black uppercase tracking-widest mb-6">Ready to start?</p>
          <h2 className="text-[clamp(48px,8vw,100px)] font-black text-white leading-tight tracking-tighter mb-6">
            Build together.<br />
            <span className="gradient-text">Ship faster.</span>
          </h2>
          <p className="text-white/35 text-xl max-w-lg mx-auto mb-12 font-light">
            One workspace. Every tool your team needs. Completely free.
          </p>
          <button onClick={() => setModal('register')}
            className="inline-flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white text-xl font-black rounded-2xl shadow-2xl shadow-blue-900/60 hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-200 active:scale-95">
            Get started free <ArrowheadIcon className="w-6 h-6" />
          </button>
          <p className="text-white/20 text-sm mt-5">No credit card · Instant access · Free forever</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 border-t border-white/5 py-14">
        <div className="section">
          <div className="flex flex-wrap items-start justify-between gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                  <ArrowheadIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white text-xl font-black">sethu</span>
              </div>
              <p className="text-gray-600 text-sm max-w-xs leading-relaxed">
                One workspace for bugs, features, sprints, and team chat.
              </p>
            </div>
            <div className="flex gap-16">
              <div>
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">Product</div>
                <div className="space-y-2.5">
                  {['Features','How it works','About'].map(l => (
                    <button key={l} onClick={() => go(l.toLowerCase().replace(' ', '-'))} className="block text-gray-600 hover:text-white text-sm transition-colors">{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">Company</div>
                <div className="space-y-2.5">
                  {['Privacy','Terms','Contact'].map(l => (
                    <button key={l} className="block text-gray-600 hover:text-white text-sm transition-colors">{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">Social</div>
              <div className="flex gap-2">
                {[Github, Twitter, Linkedin].map((Icon, i) => (
                  <div key={i} className="w-9 h-9 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">
                    <Icon className="w-4 h-4 text-gray-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-wrap items-center justify-between gap-4">
            <span className="text-gray-700 text-xs">© {new Date().getFullYear()} Sethu. Built for teams who ship.</span>
            <span className="text-gray-700 text-xs">Free forever · No credit card required</span>
          </div>
        </div>
      </footer>

      {modal && <AuthModal defaultMode={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
