'use client'

import { useCallback, useEffect, useState } from 'react'

// Números ao vivo pro card de transmissão em andamento (atualiza a cada 10s)
export default function LiveNowStat({ liveId }: { liveId: string }) {
  const [metrics, setMetrics] = useState<{
    watchingNow: number
    peak: number
    msgsLastMin: number
  } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/metrics/${liveId}`, { cache: 'no-store' })
      if (res.ok) setMetrics(await res.json())
    } catch {
      // próximo tick
    }
  }, [liveId])

  useEffect(() => {
    load()
    const t = setInterval(load, 10_000)
    return () => clearInterval(t)
  }, [load])

  if (!metrics) return null

  const items = [
    { value: metrics.watchingNow, label: 'assistindo' },
    { value: metrics.peak, label: 'pico' },
    { value: metrics.msgsLastMin, label: 'msgs/min' },
  ]

  return (
    <div className="flex gap-2.5">
      {items.map((i) => (
        <div
          key={i.label}
          className="w-[4.5rem] rounded-xl bg-white/10 border border-white/10 py-2 text-center"
        >
          <p className="text-xl font-black leading-none tabular-nums text-gold-400">
            {i.value}
          </p>
          <p className="text-[10px] uppercase text-white/60 mt-1">{i.label}</p>
        </div>
      ))}
    </div>
  )
}
