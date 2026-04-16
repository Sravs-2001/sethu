'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import type { Project } from '@/types'
import ArrowheadIcon from '@/components/ui/ArrowheadIcon'
import { FolderKanban, ChevronRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

const AVATAR_COLORS = [
  '#0052CC', '#6554C0', '#00B8D9', '#36B37E',
  '#FF5630', '#FF991F', '#172B4D', '#403294',
]

function toKey(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 4) || 'PROJ'
}

type SetupState = 'idle' | 'migrating' | 'needs-token' | 'ready' | 'error'

export default function CreateProject({ onCreated }: { onCreated: (p: Project) => void }) {
  const { user } = useStore()

  const [setupState, setSetupState] = useState<SetupState>('idle')
  const [setupError, setSetupError] = useState('')

  const [name, setName]               = useState('')
  const [key, setKey]                 = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor]             = useState(AVATAR_COLORS[0])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  // Auto-run migration on mount
  useEffect(() => {
    runSetup()
  }, [])

  async function runSetup() {
    setSetupState('migrating')
    setSetupError('')
    try {
      const res  = await fetch('/api/setup', { method: 'POST' })
      const body = await res.json()

      if (!res.ok) {
        if (body.needsToken) {
          setSetupState('needs-token')
        } else {
          setSetupState('error')
          setSetupError(body.error ?? 'Migration failed')
        }
        return
      }
      setSetupState('ready')
    } catch (e: any) {
      setSetupState('error')
      setSetupError(e.message)
    }
  }

  function handleNameChange(v: string) {
    setName(v)
    setKey(toKey(v))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/project/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), key: key || toKey(name),
        description: description.trim() || null, avatar_color: color,
      }),
    })
    const body = await res.json()
    if (!res.ok) { setError(body.error || 'Failed to create project'); setSaving(false); return }

    onCreated(body.project as Project)
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col">
      {/* Top bar */}
      <header className="h-12 bg-[#0052CC] flex items-center px-5 gap-3 flex-shrink-0">
        <ArrowheadIcon className="w-5 h-5 text-white" />
        <span className="text-white text-sm font-semibold">Sethu</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">

        {/* ── Migrating ── */}
        {setupState === 'migrating' && (
          <div className="flex flex-col items-center gap-3 text-[#5E6C84]">
            <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
            <p className="text-sm font-medium">Setting up database…</p>
          </div>
        )}

        {/* ── Needs token ── */}
        {setupState === 'needs-token' && (
          <div className="bg-white rounded border border-[#DFE1E6] w-full max-w-lg p-6 space-y-4"
            style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.12)' }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#FF8B00] flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-[#172B4D] mb-1">One-time setup required</h2>
                <p className="text-sm text-[#5E6C84]">
                  Add your Supabase personal access token so the app can create the database table automatically.
                </p>
              </div>
            </div>

            <ol className="space-y-2 text-sm text-[#172B4D]">
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">1</span>
                Go to <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noreferrer"
                  className="text-[#0052CC] underline">supabase.com → Account → Access Tokens</a>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                Click <strong>Generate new token</strong>, give it any name, copy it
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">3</span>
                Add this line to your <code className="bg-[#F4F5F7] px-1 rounded text-xs">.env.local</code> file:
              </li>
            </ol>

            <div className="bg-[#172B4D] rounded px-4 py-3">
              <code className="text-[#4C9AFF] text-xs font-mono">SUPABASE_ACCESS_TOKEN=your_token_here</code>
            </div>

            <div className="flex gap-2">
              <button onClick={runSetup} className="btn-primary">
                <Loader2 className="w-3.5 h-3.5" /> Retry after adding token
              </button>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {setupState === 'error' && (
          <div className="bg-white rounded border border-[#DFE1E6] w-full max-w-lg p-6 space-y-3"
            style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.12)' }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#DE350B] flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-[#172B4D] mb-1">Setup failed</h2>
                <p className="text-xs text-[#DE350B] font-mono bg-[#FFEBE6] px-2 py-1 rounded">{setupError}</p>
              </div>
            </div>
            <button onClick={runSetup} className="btn-primary">Retry</button>
          </div>
        )}

        {/* ── Ready: create project form ── */}
        {setupState === 'ready' && (
          <div className="bg-white rounded border border-[#DFE1E6] w-full max-w-lg"
            style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.12)' }}>
            <div className="px-6 pt-6 pb-4 border-b border-[#DFE1E6]">
              <div className="flex items-center gap-2 mb-1">
                <FolderKanban className="w-5 h-5 text-[#0052CC]" />
                <h1 className="text-lg font-semibold text-[#172B4D]">Create your project</h1>
              </div>
              <p className="text-sm text-[#5E6C84]">
                A project is where your team tracks bugs, features, and sprints.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Avatar preview + colour picker */}
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {key || 'P'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#5E6C84] mb-2">Project colour</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c} type="button" onClick={() => setColor(c)}
                        className="w-6 h-6 rounded transition-transform hover:scale-110"
                        style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1">
                  Project name <span className="text-[#DE350B]">*</span>
                </label>
                <input
                  className="input" value={name} onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Mobile App, Backend API" required autoFocus
                />
              </div>

              {/* Key */}
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1">
                  Project key <span className="text-[#DE350B]">*</span>
                </label>
                <input
                  className="input" value={key}
                  onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="PROJ" required
                />
                <p className="text-[11px] text-[#7A869A] mt-1">
                  Short identifier used for issue keys (e.g. {key || 'PROJ'}-1)
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1">
                  Description <span className="text-[#7A869A] font-normal">(optional)</span>
                </label>
                <textarea
                  className="input resize-none h-20" value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this project about?"
                />
              </div>

              {error && (
                <p className="text-xs text-[#DE350B] bg-[#FFEBE6] px-3 py-2 rounded">{error}</p>
              )}

              <div className="pt-1">
                <button
                  type="submit" disabled={saving || !name.trim()}
                  className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating project…</>
                    : <>Create project <ChevronRight className="w-3.5 h-3.5" /></>
                  }
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
