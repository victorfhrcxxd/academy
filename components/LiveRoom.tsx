'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

// Sala de transmissão: player + painel lateral com opção de esconder o chat
// (preferência salva no navegador; escondido, o player ocupa a largura toda)
export default function LiveRoom({ main, side }: { main: ReactNode; side: ReactNode }) {
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
        <button
          onClick={toggle}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-navy-950 hover:bg-navy-900 text-white font-bold text-sm px-5 py-3 shadow-lg transition"
          title="Mostrar chat e perguntas"
        >
          💬 Mostrar chat
        </button>
      </>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] items-start">
      <div>{main}</div>
      <div className="lg:h-[calc(100vh-230px)] lg:min-h-[540px] lg:sticky lg:top-6 relative">
        <button
          onClick={toggle}
          className="absolute top-2.5 right-2.5 z-10 h-8 w-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition text-sm"
          title="Esconder chat"
        >
          ✕
        </button>
        {side}
      </div>
    </div>
  )
}
