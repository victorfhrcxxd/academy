'use client'

import { useEffect, useState } from 'react'

// Inibidor de DevTools para a área do aluno:
// - bloqueia botão direito e atalhos de inspeção (F12, Ctrl+Shift+I/J/C, Ctrl+U/S)
// - detecta DevTools acoplado (diferença entre janela externa e viewport) e cobre a tela
export default function DevToolsBlocker() {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase()
      const combo = (e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(k)
      const single = k === 'F12'
      const ctrlOnly = (e.ctrlKey || e.metaKey) && ['U', 'S'].includes(k)
      if (combo || single || ctrlOnly) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const check = () => {
      const gapW = window.outerWidth - window.innerWidth
      const gapH = window.outerHeight - window.innerHeight
      setBlocked(gapW > 200 || gapH > 220)
    }

    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('keydown', onKeyDown, true)
    const t = setInterval(check, 1000)
    check()

    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('keydown', onKeyDown, true)
      clearInterval(t)
    }
  }, [])

  if (!blocked) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-navy-950 text-white flex flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl mb-6">🔒</p>
      <p className="text-xl font-bold mb-2">Ferramentas de desenvolvedor detectadas</p>
      <p className="text-white/70 max-w-md">
        Por segurança, o conteúdo fica indisponível enquanto o console do navegador
        estiver aberto. Feche as ferramentas de desenvolvedor para continuar assistindo.
      </p>
    </div>
  )
}
