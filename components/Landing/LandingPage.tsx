'use client'

import { useState, useEffect } from 'react'
import {
  Bug, Sparkles, Rocket, MessageSquare, Users,
  CheckCircle, ChevronRight, Menu, X as XIcon, Zap,
  LayoutDashboard, ArrowRight, Star,
} from 'lucide-react'
import AuthModal from './AuthModal'

type AuthMode = 'login' | 'register'

// ── Nav ──────────────────────────────────────────────────────────────────
function Nav({ onAuth }: { onAuth: (m: AuthMode) => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = ['Features', 'How it works', 'Pricing', 'About']

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 transition-all duration-200"
      style={{
        background: scrolled ? 'rgba(0,52,204,0.97)' : '#0052CC',
        boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-5 h-14 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
              <path d="M14 2L3 13l5 5 6-6 6 6 5-5L14 2z" fill="white" opacity="0.9" />
              <path d="M14 26L3 15l5-5 6 6 6-6 5 5-11 11z" fill="white" opacity="0.6" />
            </svg>
          </div>
          <span className="text-white font-black text-lg tracking-tight">Sethu</span>
        </div>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {links.map(l => (
            <button key={l} className="px-3 py-1.5 text-[13px] font-medium text-white/75 hover:text-white hover:bg-white/10 rounded transition-colors">
              {l}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => onAuth('login')}
            className="hidden md:block px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-white/10 rounded transition-colors"
          >
            Log in
          </button>
          <button
            onClick={() => onAuth('register')}
            className="px-4 py-1.5 text-[13px] font-semibold rounded transition-colors"
            style={{ background: 'white', color: '#0052CC' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#E6EFFD')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'white')}
          >
            Get it free
          </button>
          <button className="md:hidden p-2 text-white" onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0052CC] border-t border-white/10 px-5 pb-4">
          {links.map(l => (
            <button key={l} className="block w-full text-left py-2.5 text-sm font-medium text-white/75 hover:text-white transition-colors">
              {l}
            </button>
          ))}
          <div className="flex gap-2 mt-3">
            <button onClick={() => { setMobileOpen(false); onAuth('login') }}
              className="flex-1 py-2 text-sm font-semibold text-white border border-white/30 rounded hover:bg-white/10 transition-colors">
              Log in
            </button>
            <button onClick={() => { setMobileOpen(false); onAuth('register') }}
              className="flex-1 py-2 text-sm font-semibold rounded"
              style={{ background: 'white', color: '#0052CC' }}>
              Get it free
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────
function Hero({ onAuth }: { onAuth: (m: AuthMode) => void }) {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32"
      style={{ background: 'linear-gradient(160deg, #0747A6 0%, #0052CC 40%, #0065FF 100%)' }}>
      {/* Background grid decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Gradient blobs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: '#4C9AFF' }} />
      <div className="absolute bottom-0 -left-24 w-64 h-64 rounded-full opacity-15 blur-3xl" style={{ background: '#00B8D9' }} />

      <div className="relative max-w-7xl mx-auto px-5">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Star className="w-3 h-3 text-yellow-300" />
            The #1 project management tool for agile teams
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-5">
            Move fast.<br />
            <span style={{ color: '#4C9AFF' }}>Stay aligned.</span><br />
            Build better.
          </h1>
          <p className="text-lg text-white/70 mb-8 max-w-xl leading-relaxed">
            Sethu is the project management tool teams use to plan, track, and ship great software.
            Built for developers, loved by teams.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onAuth('register')}
              className="flex items-center gap-2 px-6 py-3 rounded font-bold text-[#0052CC] transition-all hover:bg-blue-50 text-sm shadow-lg"
              style={{ background: 'white' }}
            >
              Get Sethu free <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onAuth('login')}
              className="flex items-center gap-2 px-6 py-3 rounded font-bold text-white border border-white/30 hover:bg-white/10 transition-all text-sm"
            >
              Sign in to your workspace
            </button>
          </div>

          <p className="text-white/40 text-xs mt-4">
            Free for teams up to 10 · No credit card required
          </p>
        </div>

        {/* Hero product preview */}
        <div className="mt-14 relative">
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-white/20" />
                <span className="w-3 h-3 rounded-full bg-white/20" />
                <span className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <div className="flex-1 mx-4 px-3 py-1 rounded bg-white/10 text-white/40 text-xs">
                app.sethu.io/dashboard
              </div>
            </div>

            {/* Mock kanban board */}
            <div className="p-4">
              <div className="flex gap-3 overflow-hidden">
                {[
                  { label: 'TO DO', color: '#DFE1E6', count: 3, cards: ['Redesign auth flow', 'Add dark mode', 'Fix mobile nav'] },
                  { label: 'IN PROGRESS', color: '#0052CC', count: 2, cards: ['API rate limiting', 'Dashboard widgets'] },
                  { label: 'IN REVIEW', color: '#6554C0', count: 1, cards: ['Sprint retrospective'] },
                  { label: 'DONE', color: '#36B37E', count: 4, cards: ['User auth system', 'Database setup', 'CI/CD pipeline', 'Team invites'] },
                ].map(col => (
                  <div key={col.label} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      <span className="text-[10px] font-bold text-white/60 uppercase tracking-wide">{col.label}</span>
                      <span className="text-[10px] text-white/40 ml-0.5">{col.count}</span>
                    </div>
                    <div className="space-y-1.5">
                      {col.cards.map(card => (
                        <div key={card} className="rounded px-2.5 py-2 text-[11px] text-white/80 font-medium"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {card}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: LayoutDashboard,
      color: '#0052CC',
      bg: '#DEEBFF',
      title: 'Scrum & Kanban boards',
      desc: 'Plan and visualize your work with flexible boards. Move issues across columns, track progress in real-time.',
    },
    {
      icon: Bug,
      color: '#DE350B',
      bg: '#FFEBE6',
      title: 'Bug tracking',
      desc: 'Capture, prioritize, and resolve bugs before they reach production. Never lose track of an issue again.',
    },
    {
      icon: Rocket,
      color: '#36B37E',
      bg: '#E3FCEF',
      title: 'Sprint planning',
      desc: 'Run agile sprints with start/end dates, goals, and velocity tracking. Ship faster, plan smarter.',
    },
    {
      icon: Sparkles,
      color: '#6554C0',
      bg: '#EAE6FF',
      title: 'Feature roadmap',
      desc: 'Manage features and stories with a visual backlog. Keep your team focused on what matters most.',
    },
    {
      icon: Users,
      color: '#0065FF',
      bg: '#DEEBFF',
      title: 'Team management',
      desc: 'Invite teammates, assign roles (Admin / Member), and collaborate across projects seamlessly.',
    },
    {
      icon: MessageSquare,
      color: '#00B8D9',
      bg: '#E6FCFF',
      title: 'Real-time chat',
      desc: 'Built-in team chat with channels. No more context-switching between tools.',
    },
  ]

  return (
    <section className="py-20 bg-white" id="features">
      <div className="max-w-7xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#0052CC] uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-black text-[#172B4D] mb-4">
            Everything your team needs
          </h2>
          <p className="text-[#5E6C84] text-lg max-w-xl mx-auto">
            One tool to plan, track, and ship. No integrations needed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title}
              className="p-6 rounded-xl border border-[#DFE1E6] hover:border-[#0052CC] hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="text-base font-bold text-[#172B4D] mb-2">{title}</h3>
              <p className="text-sm text-[#5E6C84] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Demo accounts banner ──────────────────────────────────────────────────
function DemoBanner({ onLogin }: { onLogin: () => void }) {
  const demoUsers = [
    { name: 'Alice Johnson', email: 'alice@mailinator.com', role: 'Admin', color: '#0052CC' },
    { name: 'Bob Smith',     email: 'bob@mailinator.com',   role: 'Member', color: '#6554C0' },
    { name: 'Carol Davis',   email: 'carol@mailinator.com', role: 'Member', color: '#36B37E' },
    { name: 'David Wilson',  email: 'david@mailinator.com', role: 'Member', color: '#FF5630' },
    { name: 'Emma Brown',    email: 'emma@mailinator.com',  role: 'Member', color: '#00B8D9' },
  ]

  return (
    <section className="py-16 bg-[#F4F5F7]" id="demo">
      <div className="max-w-7xl mx-auto px-5">
        <div className="bg-white rounded-2xl border border-[#DFE1E6] p-8"
          style={{ boxShadow: '0 2px 8px rgba(9,30,66,0.08)' }}>
          <div className="flex items-start gap-4 mb-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-[#0052CC]" />
                <h3 className="text-xl font-bold text-[#172B4D]">Try with demo accounts</h3>
              </div>
              <p className="text-sm text-[#5E6C84]">
                Log in instantly with any of these demo accounts (password: <code className="bg-[#F4F5F7] px-1.5 py-0.5 rounded text-xs font-mono">demo1234</code>)
              </p>
            </div>
            <button onClick={onLogin}
              className="ml-auto btn-primary flex-shrink-0">
              Log in now →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {demoUsers.map(u => (
              <div key={u.email}
                className="flex items-center gap-3 p-3 rounded-lg border border-[#DFE1E6] hover:border-[#0052CC] hover:bg-[#F4F5F7] transition-all group cursor-pointer"
                onClick={onLogin}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: u.color }}>
                  {u.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#172B4D] truncate">{u.name}</div>
                  <div className="text-[11px] text-[#7A869A] truncate">{u.email}</div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    u.role === 'Admin'
                      ? 'bg-[#FFFAE6] text-amber-700'
                      : 'bg-[#F4F5F7] text-[#5E6C84]'
                  }`}>{u.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── CTA ───────────────────────────────────────────────────────────────────
function CTA({ onAuth }: { onAuth: (m: AuthMode) => void }) {
  return (
    <section className="py-20" style={{ background: '#0052CC' }}>
      <div className="max-w-3xl mx-auto px-5 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
          Start shipping faster today
        </h2>
        <p className="text-white/70 text-lg mb-8">
          Join thousands of agile teams already using Sethu to manage their projects.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => onAuth('register')}
            className="px-8 py-3 rounded font-bold text-[#0052CC] bg-white hover:bg-blue-50 transition-colors text-sm"
          >
            Get started for free
          </button>
          <button
            onClick={() => onAuth('login')}
            className="px-8 py-3 rounded font-bold text-white border border-white/30 hover:bg-white/10 transition-colors text-sm"
          >
            Sign in
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-10 border-t border-[#DFE1E6] bg-white">
      <div className="max-w-7xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 28 28" className="w-6 h-6" fill="none">
            <path d="M14 2L3 13l5 5 6-6 6 6 5-5L14 2z" fill="#0052CC" opacity="0.9" />
            <path d="M14 26L3 15l5-5 6 6 6-6 5 5-11 11z" fill="#0052CC" opacity="0.5" />
          </svg>
          <span className="font-black text-[#172B4D]">Sethu</span>
        </div>
        <p className="text-xs text-[#7A869A]">
          © {new Date().getFullYear()} Sethu. Built for agile teams everywhere.
        </p>
        <div className="flex gap-4">
          {['Privacy', 'Terms', 'Security'].map(l => (
            <button key={l} className="text-xs text-[#5E6C84] hover:text-[#0052CC] transition-colors">{l}</button>
          ))}
        </div>
      </div>
    </footer>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [authModal, setAuthModal] = useState<AuthMode | null>(null)

  return (
    <div className="min-h-screen bg-white">
      <Nav onAuth={setAuthModal} />
      <Hero onAuth={setAuthModal} />
      <Features />
      <DemoBanner onLogin={() => setAuthModal('login')} />
      <CTA onAuth={setAuthModal} />
      <Footer />

      {authModal && (
        <AuthModal defaultMode={authModal} onClose={() => setAuthModal(null)} />
      )}
    </div>
  )
}
