'use client'

import { useCallback, useEffect, useState } from 'react'

interface Metrics {
  watchingNow: number
  peak: number
  msgsLastMin: number
  totalAttendees: number
}

// Métricas em tempo real do dia (atualiza a cada 10s)
export default function AdminLiveMetrics({ liveId }: { liveId: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/metrics/${liveId}`, { cache: 'no-store' })
      if (res.ok) setMetrics(await res.json())
    } catch {
      // tenta no próximo tick
    }
  }, [liveId])

  useEffect(() => {
    load()
    const t = setInterval(load, 10_000)
    return () => clearInterval(t)
  }, [load])

  if (!metrics) return null

  const items = [
    { label: 'Assistindo agora', value: metrics.watchingNow, live: metrics.watchingNow > 0 },
    { label: 'Pico simultâneo', value: metrics.peak },
    { label: 'Mensagens/min', value: metrics.msgsLastMin },
    { label: 'Alunos únicos', value: metrics.totalAttendees },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-2xl font-bold text-navy-950 flex items-center gap-2">
            {i.live && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
            {i.value}
          </p>
          <p className="text-xs text-gray-500">{i.label}</p>
        </div>
      ))}
    </div>
  )
}
