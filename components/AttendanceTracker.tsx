'use client'

import { useEffect } from 'react'

// Marca presença do aluno: ping imediato + a cada 45s enquanto a aba está visível
export default function AttendanceTracker({ liveId }: { liveId: string }) {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== 'visible') return
      fetch(`/api/presence/${liveId}`, { method: 'POST' }).catch(() => null)
    }

    ping()
    const t = setInterval(ping, 45_000)
    return () => clearInterval(t)
  }, [liveId])

  return null
}
