'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { X, Hash, Link2, Mail, Check, Copy } from 'lucide-react'
import type { Channel } from '@/types'

interface Props { onClose: () => void }

export default function CreateChannelModal({ onClose }: Props) {
  const { setChannels, channels, setActiveChannel } = useStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<Channel | null>(null)
  const [copied, setCopied] = useState(false)

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const inviteUrl = created
    ? `${window.location.origin}/join/${created.name}`
    : slug
    ? `${window.location.origin}/join/${slug}`
    : ''

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!slug) return
    setError(''); setLoading(true)

    const { data, error: err } = await supabase
      .from('channels')
      .insert({ name: slug, description: description.trim() || null })
      .select()
      .single()

    if (err) {
      setError(err.message.includes('unique') ? 'A channel with that name already exists.' : err.message)
    } else if (data) {
      setChannels([...channels, data as Channel])
      setActiveChannel(data as Channel)
      setCreated(data as Channel)
    }
    setLoading(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function sendEmail() {
    const subject = encodeURIComponent(`Join #${created?.name ?? slug} on Sethu`)
    const body = encodeURIComponent(
      `Hey,\n\nI'd like to invite you to the #${created?.name ?? slug} channel on Sethu — our team workspace for bug tracking, sprints, and chat.\n\nClick the link below to join:\n${inviteUrl}\n\nSee you there!`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,13,31,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Hash className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="font-black text-gray-900 text-lg">{created ? 'Channel created!' : 'New channel'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-6">
          {!created ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Channel name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">#</span>
                  <input className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. design-feedback" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                {slug && name !== slug && (
                  <p className="text-xs text-gray-400 mt-1.5">Will be created as <strong className="text-gray-600">#{slug}</strong></p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Description <span className="font-normal normal-case text-gray-400">(optional)</span>
                </label>
                <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What's this channel for?" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              {slug && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invite link preview</p>
                  <p className="text-xs text-gray-500 font-mono truncate">{`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${slug}`}</p>
                </div>
              )}
              {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
              <button type="submit" disabled={!slug || loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all active:scale-[0.98] text-sm disabled:opacity-50">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…
                  </span>
                ) : 'Create channel'}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3.5">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-800">#{created.name} is live!</p>
                  <p className="text-xs text-green-600 mt-0.5">{created.description || 'Ready for your team'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Invite teammates</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 mb-2">
                  <Link2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 font-mono flex-1 truncate">{inviteUrl}</span>
                  <button onClick={copyLink}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-all flex-shrink-0 ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700'}`}>
                    {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                  </button>
                </div>
                <button onClick={sendEmail}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all active:scale-[0.98]">
                  <Mail className="w-4 h-4" />Send email invite
                </button>
                <p className="text-xs text-gray-400 mt-2 text-center">Anyone with the link can join after signing in.</p>
              </div>
              <button onClick={onClose}
                className="w-full py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Done — take me to #{created.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
