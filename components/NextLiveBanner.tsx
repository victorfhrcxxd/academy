'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NextLive {
  id: string
  title: string
  courseTitle: string
  scheduledAt: string
  status: string
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d > 0) return `${d}d ${h}h ${String(m).padStart(2, '0')}min`
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`
  return `${m}min ${String(s).padStart(2, '0')}s`
}

// Banner "próxima transmissão" com contagem regressiva (área do aluno)
export default function NextLiveBanner() {
  const [next, setNext] = useState<NextLive | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const pathname = usePathname()

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/next-live', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setNext(data.next)
    } catch {
      // tenta no próximo ciclo
    }
  }, [])

  useEffect(() => {
    load()
    const refresh = setInterval(load, 60_000)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearInterval(refresh)
      clearInterval(tick)
    }
  }, [load])

  // não mostra dentro da própria transmissão
  if (!next || pathname?.startsWith('/aulas/live/')) return null

  if (next.status === 'LIVE') {
    return (
      <Link
        href={`/aulas/live/${next.id}`}
        className="block bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 text-sm font-bold text-center transition"
      >
        ● AO VIVO AGORA: {next.title} — {next.courseTitle} · Clique para assistir →
      </Link>
    )
  }

  const remaining = new Date(next.scheduledAt).getTime() - now
  if (remaining <= 0) return null

  return (
    <Link
      href={`/aulas/live/${next.id}`}
      className="block bg-navy-900 hover:bg-navy-800 text-white px-6 py-2.5 text-sm text-center transition"
    >
      🗓 <b>{next.title}</b> ({next.courseTitle}) começa em{' '}
      <b className="text-gold-400">{formatCountdown(remaining)}</b>
    </Link>
  )
}
