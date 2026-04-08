'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
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
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelMessages = activeChannel ? (messages[activeChannel.id] ?? []) : []

  useEffect(() => {
    if (!activeChannel) return
    supabase.from('messages').select('*, user:profiles(*)')
      .eq('channel_id', activeChannel.id).order('created_at', { ascending: true }).limit(100)
      .then(({ data }) => { if (data) setMessages(activeChannel.id, data as Message[]) })
  }, [activeChannel?.id])

  useEffect(() => {
    const channel = supabase.channel('chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const { data } = await supabase.from('messages').select('*, user:profiles(*)').eq('id', payload.new.id).single()
        if (data) addMessage(data as Message)
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
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
      await supabase.from('messages').insert({ channel_id: activeChannel.id, user_id: user.id, content })
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
      <div className="w-10 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col items-center py-4">
        <button onClick={() => setCollapsed(false)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Open chat">
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>
    )
  }

  const ChannelList = (
    <div className={clsx(
      'flex flex-col flex-shrink-0',
      fullWidth ? 'w-60 border-r border-white/8 py-5' : 'px-3 py-2 border-b border-gray-100'
    )} style={fullWidth ? { background: 'linear-gradient(180deg, #0a1628 0%, #0d1f3c 100%)' } : {}}>
      <div className={clsx('flex items-center justify-between mb-2', fullWidth ? 'px-4' : 'px-2')}>
        <p className={clsx('text-[10px] font-black uppercase tracking-widest', fullWidth ? 'text-white/30' : 'text-gray-400')}>Channels</p>
        <button onClick={() => setShowCreate(true)} title="New channel"
          className={clsx('w-6 h-6 rounded-lg flex items-center justify-center transition-all',
            fullWidth ? 'bg-white/8 hover:bg-white/15 text-white/40 hover:text-white' : 'bg-gray-100 hover:bg-blue-50 text-gray-400 hover:text-blue-600')}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-0.5 px-2 flex-1 overflow-y-auto">
        {channels.map((ch) => {
          const active = activeChannel?.id === ch.id
          return (
            <div key={ch.id} className="group relative flex items-center">
              <button onClick={() => setActiveChannel(ch)}
                className={clsx(
                  'flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left font-medium pr-8',
                  active
                    ? fullWidth ? 'bg-white/15 text-white' : 'bg-blue-50 text-blue-700'
                    : fullWidth ? 'text-white/40 hover:text-white/70 hover:bg-white/8' : 'text-gray-600 hover:bg-gray-50'
                )}>
                <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{ch.name}</span>
              </button>
              <button onClick={() => copyInvite(ch)} title="Copy invite link"
                className={clsx('absolute right-1.5 w-5 h-5 rounded-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100',
                  fullWidth ? 'bg-white/10 hover:bg-white/20 text-white/60' : 'bg-gray-200 hover:bg-blue-100 text-gray-500 hover:text-blue-600')}>
                {copiedId === ch.id ? <Check className="w-3 h-3 text-green-400" /> : <Link2 className="w-3 h-3" />}
              </button>
            </div>
          )
        })}
        {channels.length === 0 && (
          <button onClick={() => setShowCreate(true)}
            className={clsx('w-full px-3 py-2 rounded-xl text-xs text-left transition-all',
              fullWidth ? 'text-white/30 hover:text-white/50' : 'text-gray-400 hover:text-blue-600')}>
            + Create your first channel
          </button>
        )}
      </div>
    </div>
  )

  const Messages = (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
      {channelMessages.length === 0 && (
        <div className="text-center py-12">
          <Hash className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            Start the conversation in{' '}
            <strong className="text-gray-600">#{activeChannel?.name ?? 'a channel'}</strong>
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
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">
                    {msg.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="text-xs font-semibold text-gray-700">{isMe ? 'You' : (msg.user?.name ?? 'Unknown')}</span>
                <span className="text-[10px] text-gray-400">{formatTime(new Date(msg.created_at))}</span>
              </div>
            )}
            <div className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
              <div className={clsx(
                'max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words',
                isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              )}>
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
    <div className="px-4 py-3 border-t border-gray-100 bg-white">
      <form onSubmit={sendMessage} className="flex items-center gap-2">
        <input
          className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
          placeholder={activeChannel ? `Message #${activeChannel.name}` : 'Select a channel…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!activeChannel}
        />
        <button type="submit" disabled={!input.trim() || sending || !activeChannel}
          className={clsx('w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0',
            input.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400')}>
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
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="font-bold text-gray-900">{activeChannel?.name ?? 'Select a channel'}</span>
                {activeChannel?.description && (
                  <span className="text-sm text-gray-400 ml-1 hidden sm:block">— {activeChannel.description}</span>
                )}
              </div>
              {activeChannel && (
                <button onClick={() => copyInvite(activeChannel)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
                  {copiedId === activeChannel.id
                    ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied!</>
                    : <><Link2 className="w-3.5 h-3.5" />Invite</>}
                </button>
              )}
            </div>
            {Messages}
            {Input}
          </div>
        </div>
      ) : (
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-sm text-gray-900">Team Chat</span>
            </div>
            <button onClick={() => setCollapsed(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
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
