'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  LayoutGrid, Bug, Sparkles, MessageSquare, Users,
  ArrowRight, Rocket, BarChart2, Lock,
  CheckCircle, ChevronRight, Layers, Shield, Zap,
  Target, TrendingUp, Clock,
} from 'lucide-react'
import AuthModal from './AuthModal'
import JiraLogo from '@/components/ui/JiraLogo'

type AuthMode = 'login' | 'register'

const COLS = [
  {
    title: 'To Do', color: '#6B7280', items: [
      { label: 'Login crash on iOS', p: '#EF4444', pt: 'Critical' },
      { label: 'Dark mode toggle', p: '#6B7280', pt: 'Medium' },
    ]
  },
  {
    title: 'In Progress', color: '#3B82F6', items: [
      { label: 'API rate limiting', p: '#F59E0B', pt: 'High' },
      { label: 'Analytics v2', p: '#3B82F6', pt: 'Medium' },
    ]
  },
  {
    title: 'Review', color: '#8B5CF6', items: [
      { label: 'CSV export', p: '#10B981', pt: 'Low' },
    ]
  },
  {
    title: 'Done', color: '#10B981', items: [
      { label: 'OAuth integration', p: '#10B981', pt: 'Low' },
    ]
  },
]

function BoardPreview() {
  return (
    <div className="relative">
      <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white border border-gray-200">
        <div className="flex items-center gap-2 px-5 h-14 border-b border-gray-100 bg-white">
          <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
            <JiraLogo size={14} className="text-white" />
          </div>
          <div>
            <span className="text-gray-900 text-sm font-bold block leading-none">sethu</span>
            <span className="text-gray-500 text-[10px] block mt-0.5">Mobile App</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 text-[10px] font-bold flex items-center justify-center border-2 border-white">S</div>
              <div className="w-7 h-7 rounded-full bg-gray-400 text-gray-700 text-[10px] font-bold flex items-center justify-center border-2 border-white">A</div>
              <div className="w-7 h-7 rounded-full bg-gray-500 text-gray-700 text-[10px] font-bold flex items-center justify-center border-2 border-white">+</div>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors">
              + New
            </button>
          </div>
        </div>

        <div className="flex bg-gray-50">
          <div className="w-28 border-r border-gray-100 py-4 bg-white flex-shrink-0">
            {['Summary', 'Board', 'Backlog', 'Issues', 'Features'].map((item, i) => (
              <div key={item} className={`px-4 py-2 text-xs font-medium rounded-lg mx-2 mb-1 transition-all ${i === 1
                ? 'bg-gray-100 text-gray-900 font-semibold'
                : 'text-gray-500 hover:bg-gray-50'
                }`}>
                {item}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-4 gap-3 p-4">
            {COLS.map(col => (
              <div key={col.title} className="rounded-xl p-3 bg-white border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-xs font-semibold text-gray-700">{col.title}</span>
                  </div>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{col.items.length}</span>
                </div>
                <div className="space-y-2">
                  {col.items.map((item, i) => (
                    <div key={i} className="group bg-white rounded-xl p-2.5 border border-gray-100 cursor-pointer">
                      <p className="text-[11px] text-gray-700 leading-snug font-medium mb-2">{item.label}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: item.p + '15', color: item.p }}>{item.pt}</span>
                      </div>
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

// ── Features ─────────────────────────────────────────────────────
const FEATURES = [
  { icon: LayoutGrid, title: 'Kanban Board', desc: 'Board + list view. Filter by type, priority, assignee. Real-time updates across your team.' },
  { icon: Layers, title: 'Sprint Backlog', desc: 'Plan sprints with goals and dates. Track velocity across completed sprints.' },
  { icon: Bug, title: 'Issue Tracking', desc: 'Epics, Stories, Tasks, Bugs — each with priority, status, assignee, and sprint.' },
  { icon: Sparkles, title: 'Feature Roadmap', desc: 'Manage feature requests separately from bugs. Grouped by status, linked to sprints.' },
  { icon: BarChart2, title: 'Reports', desc: 'Priority breakdown, status distribution, sprint velocity, team workload charts.' },
  { icon: Lock, title: 'Private Projects', desc: 'Invite-only access. No one outside your invite list can see your project.' },
  { icon: MessageSquare, title: 'Team Chat', desc: 'Real-time channels per project. Invite teammates with a shareable link.' },
  { icon: Users, title: 'Role Control', desc: 'Admins get Reports + Settings. Members get everything else. Clear role badge in sidebar.' },
]

export default function LandingPage() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite_token') ?? undefined

  useEffect(() => {
    if (inviteToken) setAuthMode('register')
  }, [inviteToken])

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-hidden">

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gray-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-gray-100/50 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center">
            <JiraLogo size={18} className="text-white" />
          </div>
          <span className="text-gray-900 font-bold text-xl tracking-tight">sethu</span>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {['Features', 'How it works'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              {l}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setAuthMode('login')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            Sign in
          </button>
          <button onClick={() => setAuthMode('register')}
            className="px-5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 py-20 md:py-28">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-gray-50 border border-gray-200 mb-6">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-600">AI-powered sprint planning</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-tight mb-6">
              Project management<br />
              <span className="text-gray-400">reimagined.</span>
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Beautiful boards, intelligent sprints, seamless collaboration. The workspace your team will actually love using.
            </p>

            <div className="flex items-center justify-center lg:justify-start gap-4 mb-12">
              <button onClick={() => setAuthMode('register')}
                className="group flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors">
                Start for free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => setAuthMode('login')}
                className="px-8 py-3.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                Sign in
              </button>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-10">
              {[['10k+', 'Issues tracked'], ['500+', 'Teams'], ['∞', 'Possibilities']].map(([n, l]) => (
                <div key={l} className="text-center lg:text-left">
                  <div className="text-2xl font-black text-gray-900">{n}</div>
                  <div className="text-xs text-gray-500 font-medium">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full max-w-2xl">
            <BoardPreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Powerful Features
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Everything you need to ship</h2>
            <p className="text-lg text-gray-600">One beautiful workspace. Infinite possibilities.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-gray-700" />
                </div>
                <p className="text-base font-bold text-gray-900 mb-2">{title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats banner */}
      <section className="relative px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gray-50 rounded-2xl p-10 border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { num: '99.9%', label: 'Uptime' },
                { num: '256-bit', label: 'Encryption' },
                { num: '24/7', label: 'Support' },
                { num: '100%', label: 'Private' },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div className="text-3xl md:text-4xl font-black text-gray-900 mb-2">{num}</div>
                  <div className="text-sm text-gray-600 font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 mb-4">
              <Zap className="w-3.5 h-3.5" />
              Lightning Fast
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Up and running in minutes</h2>
            <p className="text-lg text-gray-600">No setup. No credit card. Just productivity.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '1', icon: Target, title: 'Create', desc: 'Name your project and get a beautiful workspace instantly.' },
              { num: '2', icon: Users, title: 'Invite', desc: 'Share a link with your team. Private by default, always.' },
              { num: '3', icon: TrendingUp, title: 'Ship', desc: 'Track issues, plan sprints, and deliver faster than ever.' },
            ].map(({ num, icon: Icon, title, desc }) => (
              <div key={num} className="group relative text-center">
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <Icon className="w-8 h-8 text-gray-700" />
                </div>
                <p className="text-lg font-bold text-gray-900 mb-3">{title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features comparison */}
      <section className="relative px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Built for modern teams</h2>
            <p className="text-lg text-gray-600">Clear roles. Powerful permissions. Total control.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-gray-300 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-gray-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Admin</h3>
              <p className="text-sm text-gray-600 mb-6">Full control over your workspace with powerful management tools.</p>
              <div className="space-y-3">
                {['Full project access', 'Analytics & reports', 'Team management', 'Advanced settings'].map(t => (
                  <div key={t} className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-gray-300 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-gray-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Member</h3>
              <p className="text-sm text-gray-600 mb-6">Everything you need to collaborate and ship great work.</p>
              <div className="space-y-3">
                {['Create & track issues', 'Sprint planning', 'Team chat', 'Board views'].map(t => (
                  <div key={t} className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-gray-300 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-gray-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Private</h3>
              <p className="text-sm text-gray-600 mb-6">Your data stays with your team. Always secure, always private.</p>
              <div className="space-y-3">
                {['Invite-only access', 'Encrypted data', 'Isolated projects', 'GDPR compliant'].map(t => (
                  <div key={t} className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gray-900 rounded-2xl p-12 md:p-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to transform your workflow?</h2>
            <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">Join thousands of teams already shipping faster with sethu.</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button onClick={() => setAuthMode('register')}
                className="group flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold text-gray-900 bg-white hover:bg-gray-100 transition-colors">
                Create free workspace
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => setAuthMode('login')}
                className="px-8 py-4 rounded-xl text-sm font-semibold text-white bg-gray-800 hover:bg-gray-700 transition-colors">
                Sign in
              </button>
            </div>
            <p className="text-sm text-gray-500">No credit card required · Free forever for small teams</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 py-8 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center">
              <JiraLogo size={16} className="text-white" />
            </div>
            <span className="text-gray-900 font-bold text-sm">sethu</span>
          </div>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Sethu. Built for teams who ship.
          </p>
          <div className="flex items-center gap-5">
            {['Privacy', 'Terms', 'Support'].map(l => (
              <a key={l} href="#" className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
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

