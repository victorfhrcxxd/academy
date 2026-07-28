'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface NextLive {
  id: string
  courseId: string
  title: string
  courseTitle: string
  scheduledAt: string
  status: string
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  }
}

// Card de destaque do EVENTO na página de cursos: contagem pro início
// (a contagem de cada dia fica dentro da página do curso)
export default function NextLiveCard() {
  const [next, setNext] = useState<NextLive | null>(null)
  const [now, setNow] = useState(() => Date.now())

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

  if (!next) return null

  // AO VIVO agora
  if (next.status === 'LIVE') {
    return (
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-red-700 to-red-600 text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full border border-white/20" />
        <p className="text-xs font-bold tracking-widest mb-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" /> AO VIVO AGORA
        </p>
        <h2 className="text-xl sm:text-2xl font-bold leading-snug mb-1">
          {next.courseTitle}
        </h2>
        <p className="text-white/80 text-sm mb-5">{next.title}</p>
        <Link
          href={`/aulas/live/${next.id}`}
          className="inline-block rounded-xl bg-white text-red-700 font-black px-8 py-3 hover:bg-red-50 transition"
        >
          ▶ Assistir agora
        </Link>
      </div>
    )
  }

  const remaining = new Date(next.scheduledAt).getTime() - now
  if (remaining <= 0) return null
  const t = parts(remaining)

  const blocks = [
    { value: t.d, label: 'dias' },
    { value: t.h, label: 'horas' },
    { value: t.m, label: 'min' },
    { value: t.s, label: 'seg' },
  ]

  return (
    <div className="mb-8 rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full border border-white/10" />
      <div className="absolute -bottom-16 right-24 h-36 w-36 rounded-full border border-white/5" />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold tracking-widest text-gold-400 mb-2">
            🗓 SEU EVENTO COMEÇA EM
          </p>
          <h2 className="text-lg sm:text-2xl font-bold leading-snug mb-1">
            {next.courseTitle}
          </h2>
          <p className="text-white/70 text-sm">
            Início: {dateFormatter.format(new Date(next.scheduledAt))}
          </p>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="flex gap-2">
            {blocks.map((b) => (
              <div
                key={b.label}
                className="w-16 rounded-xl bg-white/10 border border-white/10 py-2.5 text-center"
              >
                <p className="text-2xl font-black text-gold-400 leading-none tabular-nums">
                  {String(b.value).padStart(2, '0')}
                </p>
                <p className="text-[10px] uppercase text-white/60 mt-1">{b.label}</p>
              </div>
            ))}
          </div>

          <Link
            href={`/aulas/curso/${next.courseId}`}
            className="hidden sm:inline-block rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold px-6 py-3 transition"
          >
            Acessar curso →
          </Link>
        </div>
      </div>

      <Link
        href={`/aulas/curso/${next.courseId}`}
        className="sm:hidden mt-5 block text-center rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold px-6 py-3 transition"
      >
        Acessar curso →
      </Link>
    </div>
  )
}
