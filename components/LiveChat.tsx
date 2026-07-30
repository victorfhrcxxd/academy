'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '@/components/Icon'

interface ChatMessage {
  id: string
  text: string
  createdAt: string
  author: string
  isAdmin: boolean
  mine: boolean
}

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

export default function LiveChat({
  liveId,
  canModerate,
  embedded = false,
}: {
  liveId: string
  canModerate: boolean
  embedded?: boolean
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState({ locked: false, slowMode: 0 })
  const [pinned, setPinned] = useState<{ id: string; text: string; author: string } | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const lastAtRef = useRef<string | null>(null)
  const stickToBottomRef = useRef(true)

  const scrollToBottom = () => {
    const el = listRef.current
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight
  }

  const fetchMessages = useCallback(async (full = false) => {
    try {
      const qs = !full && lastAtRef.current ? `?after=${encodeURIComponent(lastAtRef.current)}` : ''
      const res = await fetch(`/api/chat/${liveId}${qs}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data.settings) setSettings(data.settings)
      setPinned(data.pinned ?? null)
      const incoming: ChatMessage[] = data.messages || []
      if (incoming.length === 0) return
      lastAtRef.current = incoming[incoming.length - 1].createdAt
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id))
        const news = incoming.filter((m) => !seen.has(m.id))
        return full ? incoming : [...prev, ...news]
      })
      setTimeout(scrollToBottom, 50)
    } catch {
      // silencioso: tenta de novo no próximo tick
    }
  }, [liveId])

  useEffect(() => {
    fetchMessages(true)
    const t = setInterval(() => fetchMessages(), 4000)
    return () => clearInterval(t)
  }, [fetchMessages])

  // nome de exibição do admin fica salvo no navegador
  useEffect(() => {
    if (canModerate) {
      setDisplayName(localStorage.getItem('valeriote-chat-name') || '')
    }
  }, [canModerate])

  const saveDisplayName = (name: string) => {
    setDisplayName(name)
    localStorage.setItem('valeriote-chat-name', name)
  }

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/chat/${liveId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: value,
          ...(canModerate && displayName ? { displayName } : {}),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setError(d?.error || 'Erro ao enviar')
        return
      }
      setText('')
      stickToBottomRef.current = true
      await fetchMessages()
    } catch {
      setError('Erro de conexão')
    } finally {
      setSending(false)
    }
  }

  const remove = async (id: string) => {
    await fetch(`/api/chat/${liveId}?id=${id}`, { method: 'DELETE' })
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  const updateSettings = async (patch: {
    locked?: boolean
    slowMode?: number
    pin?: string | null
  }) => {
    const res = await fetch(`/api/chat/${liveId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const d = await res.json()
      if (d.settings) setSettings(d.settings)
      if ('pin' in patch) {
        if (patch.pin === null) setPinned(null)
        else {
          const m = messages.find((x) => x.id === patch.pin)
          if (m) setPinned({ id: m.id, text: m.text, author: m.author })
        }
      }
    }
  }

  const inputDisabled = settings.locked && !canModerate

  return (
    <div
      className={
        embedded
          ? 'flex flex-col h-full min-h-0 bg-white'
          : 'flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden h-[440px] lg:h-full'
      }
    >
      <div className="px-4 py-3 border-b border-gray-200 bg-navy-950 text-white">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-bold text-sm">
            <Icon name="message-circle" className="h-4 w-4" /> Chat ao vivo
          </p>
          {canModerate && (
            <div className="flex items-center gap-2">
              <select
                value={settings.slowMode}
                onChange={(e) => updateSettings({ slowMode: Number(e.target.value) })}
                className="rounded bg-navy-800 border border-white/20 text-xs px-1.5 py-1 text-white"
                title="Modo lento: intervalo mínimo entre mensagens por aluno"
              >
                <option value={0}>Sem delay</option>
                <option value={5}>Delay 5s</option>
                <option value={10}>Delay 10s</option>
                <option value={30}>Delay 30s</option>
                <option value={60}>Delay 1min</option>
              </select>
              <button
                onClick={() => updateSettings({ locked: !settings.locked })}
                className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-bold ${
                  settings.locked
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-navy-800 border border-white/20 hover:bg-navy-700'
                }`}
                title={settings.locked ? 'Desbloquear chat' : 'Bloquear chat'}
              >
                <Icon name={settings.locked ? 'lock' : 'unlock'} className="h-3 w-3" />
                {settings.locked ? 'Bloqueado' : 'Aberto'}
              </button>
            </div>
          )}
        </div>
        {settings.slowMode > 0 && (
          <p className="text-[11px] text-white/60 mt-1">
            Modo lento ativo: 1 mensagem a cada {settings.slowMode}s
          </p>
        )}
        {canModerate && (
          <div className="mt-2">
            {showNameInput ? (
              <div className="flex gap-2">
                <input
                  value={displayName}
                  onChange={(e) => saveDisplayName(e.target.value)}
                  maxLength={60}
                  placeholder="Ex.: Equipe Valeriote"
                  className="flex-1 rounded bg-navy-800 border border-white/20 px-2 py-1 text-xs text-white placeholder:text-white/40"
                />
                <button
                  onClick={() => setShowNameInput(false)}
                  className="rounded bg-gold-500 text-navy-950 px-2 py-1 text-xs font-bold"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNameInput(true)}
                className="flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white"
              >
                <Icon name="edit" className="h-3 w-3" /> Aparecer no chat como:{' '}
                <span className="font-bold text-gold-400">
                  {displayName || 'seu nome real'}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {pinned && (
        <div className="border-b border-gold-500/40 bg-gold-500/10 px-4 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[11px] font-bold text-gold-600 uppercase">
                <Icon name="pin" className="h-3 w-3" /> Fixado · {pinned.author}
              </p>
              <p className="text-sm text-navy-950 break-words whitespace-pre-line">
                {pinned.text}
              </p>
            </div>
            {canModerate && (
              <button
                onClick={() => updateSettings({ pin: null })}
                className="text-[11px] text-gray-500 hover:text-red-600 shrink-0"
                title="Desafixar"
              >
                desafixar
              </button>
            )}
          </div>
        </div>
      )}

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            Nenhuma mensagem ainda — seja o primeiro a comentar!
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="group text-sm">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`font-semibold ${m.isAdmin ? 'text-gold-600' : 'text-navy-900'}`}>
                {m.author}
              </span>
              {m.isAdmin && (
                <span className="rounded bg-gold-500/15 text-gold-600 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                  Equipe
                </span>
              )}
              <span className="text-[11px] text-gray-400">
                {timeFormatter.format(new Date(m.createdAt))}
              </span>
              {canModerate && (
                <>
                  <button
                    onClick={() => updateSettings({ pin: m.id })}
                    className="hidden group-hover:inline text-[11px] text-navy-700 hover:underline"
                    title="Fixar no topo do chat"
                  >
                    fixar
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    className="hidden group-hover:inline text-[11px] text-red-500 hover:underline"
                    title="Apagar mensagem"
                  >
                    apagar
                  </button>
                </>
              )}
            </div>
            <p className="text-gray-700 break-words whitespace-pre-line">{m.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="border-t border-gray-200 p-3">
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            disabled={inputDisabled}
            placeholder={
              inputDisabled ? 'Chat bloqueado pela equipe' : 'Escreva sua mensagem...'
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-navy-900 focus:ring-2 focus:ring-navy-900/15 disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={sending || !text.trim() || inputDisabled}
            className="rounded-lg bg-gold-500 hover:bg-gold-600 px-4 py-2 text-sm font-bold text-navy-950 transition disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  )
}
