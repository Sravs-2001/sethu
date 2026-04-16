'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { chatService } from '@/lib/services'
import { Send, Hash, ChevronRight, MessageSquare, Plus, Link2, Check } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import type { Message } from '@/types'
import CreateChannelModal from './CreateChannelModal'
import clsx from 'clsx'

function formatTime(date: Date) {
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`
  return format(date, 'MMM d, HH:mm')
}

interface Props { fullWidth?: boolean }

export default function ChatPanel({ fullWidth = false }: Props) {
  const { channels, activeChannel, setActiveChannel, messages, setMessages, addMessage, user } = useStore()
  const [input, setInput]     = useState('')
  const [sending, setSending] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [copiedId, setCopiedId]     = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelMessages = activeChannel ? (messages[activeChannel.id] ?? []) : []

  useEffect(() => {
    if (!activeChannel) return
    chatService.getMessages(activeChannel.id).then(({ data }) => {
      if (data) setMessages(activeChannel.id, data as Message[])
    })
  }, [activeChannel?.id])

  useEffect(() => {
    return chatService.subscribe(msg => addMessage(msg))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channelMessages.length])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !activeChannel || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    if (user) {
      await chatService.sendMessage(activeChannel.id, user.id, content)
    }
    setSending(false)
  }

  function copyInvite(ch: typeof channels[0]) {
    const url = `${window.location.origin}/join/${ch.name}`
    navigator.clipboard.writeText(url)
    setCopiedId(ch.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!fullWidth && collapsed) {
    return (
      <div className="w-10 flex-shrink-0 bg-white flex flex-col items-center py-4"
        style={{ borderLeft: '1px solid #DFE1E6' }}>
        <button onClick={() => setCollapsed(false)}
          className="p-2 rounded transition-colors"
          style={{ color: '#5E6C84' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0052CC'; (e.currentTarget as HTMLElement).style.background = '#DEEBFF' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#5E6C84'; (e.currentTarget as HTMLElement).style.background = '' }}
          title="Open chat">
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>
    )
  }

  // ── Channel list (dark for full-width, light for sidebar) ──
  const ChannelList = (
    <div className={clsx('flex flex-col flex-shrink-0', fullWidth ? 'w-56' : '')}
      style={fullWidth
        ? { background: '#0F2040', borderRight: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px', paddingBottom: '20px' }
        : { borderBottom: '1px solid #DFE1E6', padding: '8px 12px' }
      }>
      <div className={clsx('flex items-center justify-between mb-2', fullWidth ? 'px-4' : 'px-1')}>
        <p className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: fullWidth ? 'rgba(255,255,255,0.3)' : '#7A869A' }}>Channels</p>
        <button onClick={() => setShowCreate(true)} title="New channel"
          className="w-6 h-6 rounded flex items-center justify-center transition-colors"
          style={fullWidth
            ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
            : { background: '#F4F5F7', color: '#5E6C84' }}
          onMouseEnter={e => {
            if (fullWidth) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.color = 'white' }
            else { (e.currentTarget as HTMLElement).style.background = '#DEEBFF'; (e.currentTarget as HTMLElement).style.color = '#0052CC' }
          }}
          onMouseLeave={e => {
            if (fullWidth) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)' }
            else { (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; (e.currentTarget as HTMLElement).style.color = '#5E6C84' }
          }}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-0.5 px-2 flex-1 overflow-y-auto">
        {channels.map((ch) => {
          const active = activeChannel?.id === ch.id
          return (
            <div key={ch.id} className="group relative flex items-center">
              <button onClick={() => setActiveChannel(ch)}
                className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors text-left font-medium pr-8"
                style={fullWidth
                  ? active ? { background: 'rgba(255,255,255,0.12)', color: 'white' } : { color: 'rgba(255,255,255,0.45)' }
                  : active ? { background: '#DEEBFF', color: '#0052CC' } : { color: '#172B4D' }
                }
                onMouseEnter={e => {
                  if (active) return
                  if (fullWidth) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }
                  else (e.currentTarget as HTMLElement).style.background = '#F4F5F7'
                }}
                onMouseLeave={e => {
                  if (active) return
                  if (fullWidth) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.background = '' }
                  else (e.currentTarget as HTMLElement).style.background = ''
                }}>
                <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{ch.name}</span>
              </button>
              <button onClick={() => copyInvite(ch)} title="Copy invite link"
                className="absolute right-1.5 w-5 h-5 rounded flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                style={fullWidth ? { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' } : { background: '#DFE1E6', color: '#5E6C84' }}>
                {copiedId === ch.id ? <Check className="w-3 h-3" style={{ color: '#36B37E' }} /> : <Link2 className="w-3 h-3" />}
              </button>
            </div>
          )
        })}
        {channels.length === 0 && (
          <button onClick={() => setShowCreate(true)}
            className="w-full px-3 py-2 rounded text-xs text-left transition-colors"
            style={{ color: fullWidth ? 'rgba(255,255,255,0.3)' : '#7A869A' }}>
            + Create your first channel
          </button>
        )}
      </div>
    </div>
  )

  const Messages = (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ background: '#FFFFFF' }}>
      {channelMessages.length === 0 && (
        <div className="text-center py-12">
          <Hash className="w-10 h-10 mx-auto mb-3" style={{ color: '#DFE1E6' }} />
          <p className="text-sm" style={{ color: '#7A869A' }}>
            Start the conversation in{' '}
            <strong style={{ color: '#42526E' }}>#{activeChannel?.name ?? 'a channel'}</strong>
          </p>
        </div>
      )}
      {channelMessages.map((msg, i) => {
        const isMe = msg.user_id === user?.id
        const prev = channelMessages[i - 1]
        const sameUser = prev?.user_id === msg.user_id
        const timeDiff = prev ? new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() : Infinity
        const showHeader = !sameUser || timeDiff > 5 * 60 * 1000
        const avatarUrl = (msg.user as { avatar_url?: string })?.avatar_url

        return (
          <div key={msg.id} className={clsx(showHeader ? 'mt-4' : 'mt-0.5')}>
            {showHeader && (
              <div className={clsx('flex items-center gap-2 mb-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                    style={{ background: '#0052CC' }}>
                    {msg.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="text-xs font-semibold" style={{ color: '#172B4D' }}>{isMe ? 'You' : (msg.user?.name ?? 'Unknown')}</span>
                <span className="text-[10px]" style={{ color: '#97A0AF' }}>{formatTime(new Date(msg.created_at))}</span>
              </div>
            )}
            <div className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
              <div className="max-w-[75%] px-3.5 py-2 rounded text-sm leading-relaxed break-words"
                style={isMe
                  ? { background: '#0052CC', color: 'white', borderRadius: '8px 8px 2px 8px' }
                  : { background: '#F4F5F7', color: '#172B4D', borderRadius: '8px 8px 8px 2px' }
                }>
                {msg.content}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )

  const Input = (
    <div className="px-4 py-3 bg-white" style={{ borderTop: '1px solid #DFE1E6' }}>
      <form onSubmit={sendMessage} className="flex items-center gap-2">
        <input
          className="flex-1 px-3 py-2 rounded text-sm outline-none transition-colors"
          style={{ background: '#F4F5F7', border: '1px solid transparent', color: '#172B4D' }}
          placeholder={activeChannel ? `Message #${activeChannel.name}` : 'Select a channel…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={e => { (e.target as HTMLElement).style.border = '1px solid #0052CC'; (e.target as HTMLElement).style.boxShadow = '0 0 0 2px rgba(76,154,255,0.2)' }}
          onBlur={e => { (e.target as HTMLElement).style.border = '1px solid transparent'; (e.target as HTMLElement).style.boxShadow = '' }}
          disabled={!activeChannel}
        />
        <button type="submit" disabled={!input.trim() || sending || !activeChannel}
          className="w-9 h-9 rounded flex items-center justify-center transition-colors flex-shrink-0"
          style={input.trim() ? { background: '#0052CC', color: 'white' } : { background: '#F4F5F7', color: '#B3BAC5' }}>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )

  return (
    <>
      {showCreate && <CreateChannelModal onClose={() => setShowCreate(false)} />}
      {fullWidth ? (
        <div className="flex-1 flex min-w-0">
          {ChannelList}
          <div className="flex-1 flex flex-col bg-white min-w-0">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #DFE1E6' }}>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" style={{ color: '#5E6C84' }} />
                <span className="font-semibold text-sm" style={{ color: '#172B4D' }}>{activeChannel?.name ?? 'Select a channel'}</span>
                {activeChannel?.description && (
                  <span className="text-sm ml-1 hidden sm:block" style={{ color: '#7A869A' }}>— {activeChannel.description}</span>
                )}
              </div>
              {activeChannel && (
                <button onClick={() => copyInvite(activeChannel)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded transition-colors"
                  style={{ color: '#5E6C84' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0052CC'; (e.currentTarget as HTMLElement).style.background = '#DEEBFF' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#5E6C84'; (e.currentTarget as HTMLElement).style.background = '' }}>
                  {copiedId === activeChannel.id
                    ? <><Check className="w-3.5 h-3.5" style={{ color: '#36B37E' }} />Copied!</>
                    : <><Link2 className="w-3.5 h-3.5" />Invite</>}
                </button>
              )}
            </div>
            {Messages}
            {Input}
          </div>
        </div>
      ) : (
        <div className="w-72 flex-shrink-0 bg-white flex flex-col" style={{ borderLeft: '1px solid #DFE1E6' }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #DFE1E6' }}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: '#0052CC' }} />
              <span className="font-semibold text-sm" style={{ color: '#172B4D' }}>Team Chat</span>
            </div>
            <button onClick={() => setCollapsed(true)}
              className="p-1 rounded transition-colors"
              style={{ color: '#97A0AF' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#172B4D'; (e.currentTarget as HTMLElement).style.background = '#F4F5F7' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#97A0AF'; (e.currentTarget as HTMLElement).style.background = '' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {ChannelList}
          {Messages}
          {Input}
        </div>
      )}
    </>
  )
}
