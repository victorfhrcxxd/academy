'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import LiveSidePanel from '@/components/LiveSidePanel'

// Sala de transmissão: player + painel lateral com opção de esconder o chat
// (preferência salva no navegador; escondido, o player ocupa a largura toda)
export default function LiveRoom({
  main,
  liveId,
  canModerate,
}: {
  main: ReactNode
  liveId: string
  canModerate: boolean
}) {
  const [showChat, setShowChat] = useState(true)

  useEffect(() => {
    setShowChat(localStorage.getItem('valeriote-chat') !== 'oculto')
  }, [])

  const toggle = () => {
    const next = !showChat
    setShowChat(next)
    localStorage.setItem('valeriote-chat', next ? 'visivel' : 'oculto')
  }

  if (!showChat) {
    return (
      <>
        {main}
        {/* Abinha na borda direita pra reabrir o painel */}
        <button
          onClick={toggle}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 rounded-l-xl bg-navy-950 hover:bg-navy-800 text-white pl-2.5 pr-2 py-4 shadow-lg transition group"
          title="Mostrar chat e perguntas"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-gold-400 group-hover:-translate-x-0.5 transition"
          >
            <path d="m17 6-6 6 6 6" />
            <path d="m11 6-6 6 6 6" />
          </svg>
          <span className="text-base">💬</span>
        </button>
      </>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] items-start">
      <div>{main}</div>
      <div className="lg:h-[calc(100vh-230px)] lg:min-h-[540px] lg:sticky lg:top-6">
        <LiveSidePanel liveId={liveId} canModerate={canModerate} onHide={toggle} />
      </div>
    </div>
  )
}
