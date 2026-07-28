'use client'

import { useState } from 'react'
import LiveChat from '@/components/LiveChat'
import QuestionsPanel from '@/components/QuestionsPanel'

// Painel lateral da transmissão: abas Chat e Perguntas (Q&A) + botão de recolher
export default function LiveSidePanel({
  liveId,
  canModerate,
  onHide,
}: {
  liveId: string
  canModerate: boolean
  onHide?: () => void
}) {
  const [tab, setTab] = useState<'chat' | 'questions'>('chat')

  const tabCls = (active: boolean) =>
    `flex-1 px-4 py-3 text-sm font-bold transition ${
      active ? 'text-gold-400 border-b-2 border-gold-500' : 'text-white/60 hover:text-white'
    }`

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden h-[440px] lg:h-full">
      <div className="flex items-stretch border-b border-gray-200 bg-navy-950">
        <button onClick={() => setTab('chat')} className={tabCls(tab === 'chat')}>
          💬 Chat
        </button>
        <button onClick={() => setTab('questions')} className={tabCls(tab === 'questions')}>
          🙋 Perguntas
        </button>
        {onHide && (
          <button
            onClick={onHide}
            className="px-3 text-white/40 hover:text-white hover:bg-white/10 transition border-l border-white/10"
            title="Esconder painel"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m7 6 6 6-6 6" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </button>
        )}
      </div>

      <div className={`flex-1 min-h-0 ${tab === 'chat' ? 'flex' : 'hidden'} flex-col`}>
        <LiveChat liveId={liveId} canModerate={canModerate} embedded />
      </div>
      <div className={`flex-1 min-h-0 ${tab === 'questions' ? 'flex' : 'hidden'} flex-col`}>
        <QuestionsPanel liveId={liveId} canModerate={canModerate} />
      </div>
    </div>
  )
}
