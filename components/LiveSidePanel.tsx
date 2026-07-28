'use client'

import { useState } from 'react'
import LiveChat from '@/components/LiveChat'
import QuestionsPanel from '@/components/QuestionsPanel'

// Painel lateral da transmissão: abas Chat e Perguntas (Q&A)
export default function LiveSidePanel({
  liveId,
  canModerate,
}: {
  liveId: string
  canModerate: boolean
}) {
  const [tab, setTab] = useState<'chat' | 'questions'>('chat')

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden h-[440px] lg:h-full">
      <div className="flex border-b border-gray-200 bg-navy-950">
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 px-4 py-3 text-sm font-bold transition ${
            tab === 'chat' ? 'text-gold-400 border-b-2 border-gold-500' : 'text-white/60 hover:text-white'
          }`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setTab('questions')}
          className={`flex-1 px-4 py-3 text-sm font-bold transition ${
            tab === 'questions'
              ? 'text-gold-400 border-b-2 border-gold-500'
              : 'text-white/60 hover:text-white'
          }`}
        >
          🙋 Perguntas
        </button>
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
