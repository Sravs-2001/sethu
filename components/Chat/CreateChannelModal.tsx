'use client'

import { useState } from 'react'
import { chatService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import { X, Hash, Link2, Mail, Check, Copy } from 'lucide-react'
import type { Channel } from '@/types'

interface Props { onClose: () => void }

export default function CreateChannelModal({ onClose }: Props) {
  const { setChannels, channels, setActiveChannel } = useStore()
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [created, setCreated]         = useState<Channel | null>(null)
  const [copied, setCopied]           = useState(false)

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const inviteUrl = created
    ? `${window.location.origin}/join/${created.name}`
    : slug ? `${window.location.origin}/join/${slug}` : ''

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!slug) return
    setError(''); setLoading(true)
    const { data, error: err } = await chatService.createChannel(slug, description.trim() || undefined)
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
      `Hey,\n\nI'd like to invite you to the #${created?.name ?? slug} channel on Sethu.\n\nClick the link below to join:\n${inviteUrl}\n\nSee you there!`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(9,30,66,0.54)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-md rounded overflow-hidden animate-slide-in"
        style={{ boxShadow: '0 8px 24px rgba(9,30,66,0.25)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #DFE1E6' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: '#DEEBFF' }}>
              <Hash className="w-4 h-4" style={{ color: '#0052CC' }} />
            </div>
            <h2 className="font-semibold text-base" style={{ color: '#172B4D' }}>
              {created ? 'Channel created!' : 'Create channel'}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors"
            style={{ color: '#97A0AF', background: '#F4F5F7' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#DFE1E6'; (e.currentTarget as HTMLElement).style.color = '#42526E' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; (e.currentTarget as HTMLElement).style.color = '#97A0AF' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {!created ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#5E6C84' }}>
                  Channel name
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm" style={{ color: '#97A0AF' }}>#</span>
                  <input
                    className="w-full pl-7 pr-3 py-2 rounded text-sm outline-none transition-colors"
                    style={{ border: '1px solid #DFE1E6', color: '#172B4D' }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = '#0052CC'; (e.target as HTMLElement).style.boxShadow = '0 0 0 2px rgba(76,154,255,0.3)' }}
                    onBlur={e => { (e.target as HTMLElement).style.borderColor = '#DFE1E6'; (e.target as HTMLElement).style.boxShadow = '' }}
                    placeholder="e.g. design-feedback"
                    value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                {slug && name !== slug && (
                  <p className="text-xs mt-1.5" style={{ color: '#7A869A' }}>
                    Will be created as <strong style={{ color: '#42526E' }}>#{slug}</strong>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#5E6C84' }}>
                  Description <span className="font-normal normal-case" style={{ color: '#97A0AF' }}>(optional)</span>
                </label>
                <input
                  className="w-full px-3 py-2 rounded text-sm outline-none transition-colors"
                  style={{ border: '1px solid #DFE1E6', color: '#172B4D' }}
                  onFocus={e => { (e.target as HTMLElement).style.borderColor = '#0052CC'; (e.target as HTMLElement).style.boxShadow = '0 0 0 2px rgba(76,154,255,0.3)' }}
                  onBlur={e => { (e.target as HTMLElement).style.borderColor = '#DFE1E6'; (e.target as HTMLElement).style.boxShadow = '' }}
                  placeholder="What's this channel for?" value={description}
                  onChange={(e) => setDescription(e.target.value)} />
              </div>
              {slug && (
                <div className="px-3 py-2.5 rounded" style={{ background: '#F4F5F7', border: '1px solid #DFE1E6' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#7A869A' }}>Invite link preview</p>
                  <p className="text-xs font-mono truncate" style={{ color: '#42526E' }}>
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${slug}`}
                  </p>
                </div>
              )}
              {error && (
                <div className="px-3 py-2.5 rounded text-sm" style={{ background: '#FFEBE6', border: '1px solid rgba(222,53,11,0.2)', color: '#DE350B' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={!slug || loading}
                className="w-full py-2.5 text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
                style={{ background: '#0052CC' }}
                onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.background = '#0747A6')}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0052CC'}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating…
                  </span>
                ) : 'Create channel'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded" style={{ background: '#E3FCEF', border: '1px solid rgba(54,179,126,0.25)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#36B37E' }}>
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#006644' }}>#{created.name} is live!</p>
                  <p className="text-xs mt-0.5" style={{ color: '#006644', opacity: 0.75 }}>{created.description || 'Ready for your team'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#5E6C84' }}>Invite teammates</p>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded mb-2"
                  style={{ background: '#F4F5F7', border: '1px solid #DFE1E6' }}>
                  <Link2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#7A869A' }} />
                  <span className="text-xs font-mono flex-1 truncate" style={{ color: '#42526E' }}>{inviteUrl}</span>
                  <button onClick={copyLink}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded transition-colors flex-shrink-0"
                    style={copied
                      ? { background: '#E3FCEF', color: '#006644' }
                      : { background: 'white', border: '1px solid #DFE1E6', color: '#42526E' }}
                    onMouseEnter={e => !copied && ((e.currentTarget as HTMLElement).style.borderColor = '#4C9AFF')}
                    onMouseLeave={e => !copied && ((e.currentTarget as HTMLElement).style.borderColor = '#DFE1E6')}>
                    {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                  </button>
                </div>
                <button onClick={sendEmail}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-white text-sm font-semibold rounded transition-colors"
                  style={{ background: '#0052CC' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0747A6'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0052CC'}>
                  <Mail className="w-4 h-4" /> Send email invite
                </button>
                <p className="text-xs text-center mt-2" style={{ color: '#97A0AF' }}>Anyone with the link can join after signing in.</p>
              </div>

              <button onClick={onClose}
                className="w-full py-2.5 text-sm font-semibold rounded transition-colors"
                style={{ border: '1px solid #DFE1E6', color: '#42526E' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F4F5F7'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                Done — take me to #{created.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
