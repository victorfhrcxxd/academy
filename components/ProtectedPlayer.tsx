'use client'

import { useRef, useState } from 'react'
import { toEmbedUrl } from '@/lib/embed'

// Player protegido (YouTube): oculta título/controles nativos, bloqueia cliques no
// vídeo (não dá pra pausar nem abrir no YouTube) e oferece controles próprios
// (iniciar/som/volume/tela cheia) via postMessage da API de iframe do YouTube.
export default function ProtectedPlayer({
  embedUrl,
  restricted,
  title,
}: {
  embedUrl: string
  restricted: boolean
  title: string
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(100)

  const base = toEmbedUrl(embedUrl)
  const isYouTube = base.includes('youtube.com/embed/')

  // Sem proteção (ou plataforma que não é YouTube): player normal
  if (!restricted || !isYouTube) {
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-black shadow-sm">
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            src={base}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            title={title}
          />
        </div>
      </div>
    )
  }

  const sep = base.includes('?') ? '&' : '?'
  const src = `${base}${sep}enablejsapi=1&controls=0&disablekb=1&rel=0&fs=0&iv_load_policy=3&playsinline=1&autoplay=1&mute=1`

  const cmd = (func: string, args: unknown[] = []) => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    )
  }

  const start = () => {
    cmd('playVideo')
    cmd('unMute')
    cmd('setVolume', [volume])
    setMuted(false)
    setStarted(true)
  }

  const toggleMute = () => {
    if (muted) {
      cmd('unMute')
      cmd('setVolume', [volume])
    } else {
      cmd('mute')
    }
    setMuted(!muted)
  }

  const changeVolume = (v: number) => {
    setVolume(v)
    cmd('setVolume', [v])
    if (v > 0 && muted) {
      cmd('unMute')
      setMuted(false)
    }
  }

  const goFullscreen = () => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen().catch(() => null)
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-black shadow-sm">
      <div ref={wrapRef} className="relative w-full bg-black group flex flex-col">
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            ref={frameRef}
            src={src}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media"
            title={title}
          />
          {/* Escudo: bloqueia qualquer clique no player (título, pause, logo) */}
          <div className="absolute inset-0 z-10" />

          {!started && (
            <button
              onClick={start}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/60"
            >
              <span className="rounded-full bg-gold-500 hover:bg-gold-600 text-navy-950 font-black px-8 py-4 text-lg shadow-lg transition">
                ▶ Assistir com som
              </span>
            </button>
          )}
        </div>

        {/* Controles próprios */}
        <div className="relative z-20 flex items-center gap-4 bg-navy-950 px-4 py-2.5 text-white">
          <span className="flex items-center gap-2 text-xs font-bold text-red-500">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> AO VIVO
          </span>
          <button onClick={toggleMute} className="text-lg" title={muted ? 'Ativar som' : 'Silenciar'}>
            {muted ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="w-28 accent-gold-500"
            title="Volume"
          />
          <div className="flex-1" />
          <button
            onClick={goFullscreen}
            className="text-sm font-bold hover:text-gold-400"
            title="Tela cheia"
          >
            ⛶ Tela cheia
          </button>
        </div>
      </div>
    </div>
  )
}
