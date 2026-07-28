'use client'

import { useEffect, useState } from 'react'

// Contagem regressiva compacta (usada em cada dia dentro do curso)
export default function MiniCountdown({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const remaining = new Date(targetIso).getTime() - now
  if (remaining <= 0) return null

  const total = Math.floor(remaining / 1000)
  const blocks = [
    { value: Math.floor(total / 86400), label: 'dias' },
    { value: Math.floor((total % 86400) / 3600), label: 'hrs' },
    { value: Math.floor((total % 3600) / 60), label: 'min' },
    { value: total % 60, label: 'seg' },
  ]

  return (
    <div className="flex gap-1.5">
      {blocks.map((b) => (
        <div
          key={b.label}
          className="w-11 rounded-lg bg-navy-950 py-1.5 text-center"
        >
          <p className="text-sm font-black text-gold-400 leading-none tabular-nums">
            {String(b.value).padStart(2, '0')}
          </p>
          <p className="text-[9px] uppercase text-white/50 mt-0.5">{b.label}</p>
        </div>
      ))}
    </div>
  )
}
