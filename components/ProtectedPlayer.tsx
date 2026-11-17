'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toEmbedUrl } from '@/lib/embed'
import Icon from '@/components/Icon'

// Player protegido (YouTube): oculta título/controles nativos, bloqueia cliques no
// vídeo (não dá pra pausar nem abrir no YouTube) e oferece controles próprios
// (iniciar/som/volume/tela cheia) via postMessage da API de iframe do YouTube.
// Quando a live engasga, o YouTube cai no estado "encerrado" (seta de replay) e o
// escudo impede o clique: por isso o player se recarrega sozinho e há um botão manual.
const MAX_AUTO_RECOVER = 6
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
  const [reloadKey, setReloadKey] = useState(0)
  const [stalled, setStalled] = useState(false)
  const stateRef = useRef({ started: false, muted: false, volume: 100 })
  useEffect(() => {
    stateRef.current = { started, muted, volume }
  }, [started, muted, volume])
  const attemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const needsSyncRef = useRef(false)

  const post = useCallback((data: unknown) => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify(data), '*')
  }, [])

  const reload = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    needsSyncRef.current = true
    setStalled(false)
    setReloadKey((k) => k + 1)
  }, [])

  // O iframe só informa o estado depois de receber "listening"; repete até responder.
  useEffect(() => {
    let answered = false
    let tries = 0
    const handshake = setInterval(() => {
      if (answered || ++tries > 40) return clearInterval(handshake)
      post({ event: 'listening', id: 'academy', channel: 'widget' })
    }, 500)

    // O iframe recarregado volta mudo (autoplay): reaplica som e volume do aluno.
    const sync = () => {
      const { started, muted, volume } = stateRef.current
      if (!started) return
      post({ event: 'command', func: 'playVideo', args: [] })
      if (!muted) {
        post({ event: 'command', func: 'unMute', args: [] })
        post({ event: 'command', func: 'setVolume', args: [volume] })
      }
    }

    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return
      if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return
      let msg: { event?: string; info?: unknown }
      try {
        msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
      } catch {
        return
      }
      if (!answered) {
        answered = true
        if (needsSyncRef.current) sync()
      }
      const state =
        msg.event === 'onStateChange'
          ? msg.info
          : (msg.info as { playerState?: number } | null)?.playerState
      if (state === 1) {
        attemptsRef.current = 0
        setStalled(false)
        if (needsSyncRef.current) {
          needsSyncRef.current = false
          sync()
        }
      } else if (state === 0) {
        setStalled(true)
        if (!timerRef.current && attemptsRef.current < MAX_AUTO_RECOVER) {
          const wait = attemptsRef.current === 0 ? 1500 : 8000
          attemptsRef.current++
          timerRef.current = setTimeout(reload, wait)
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => {
      clearInterval(handshake)
      window.removeEventListener('message', onMessage)
    }
  }, [reloadKey, post, reload])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  const manualReload = () => {
    attemptsRef.current = 0
    reload()
  }

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
            key={reloadKey}
            ref={frameRef}
            src={src}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media"
            title={title}
          />
          {/* Escudo: bloqueia qualquer clique no player (título, pause, logo) */}
          <div className="absolute inset-0 z-10" />

          {stalled && started && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/80 text-white">
              <p className="text-sm font-bold">Reconectando à transmissão…</p>
              <button
                onClick={manualReload}
                className="rounded-full bg-gold-500 hover:bg-gold-600 text-navy-950 font-black px-6 py-3 text-sm shadow-lg transition"
              >
                Recarregar agora
              </button>
            </div>
          )}

          {!started && (
            <button
              onClick={start}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/60"
            >
              <span className="flex items-center gap-3 rounded-full bg-gold-500 hover:bg-gold-600 text-navy-950 font-black px-8 py-4 text-lg shadow-lg transition">
                <Icon name="play" className="h-5 w-5 fill-current" /> Assistir com som
              </span>
            </button>
          )}
        </div>

        {/* Controles próprios */}
        <div className="relative z-20 flex items-center gap-4 bg-navy-950 px-4 py-2.5 text-white">
          <span className="flex items-center gap-2 text-xs font-bold text-red-500">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> AO VIVO
          </span>
          <button onClick={toggleMute} title={muted ? 'Ativar som' : 'Silenciar'}>
            <Icon name={muted ? 'volume-x' : 'volume'} className="h-5 w-5" />
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
            onClick={manualReload}
            className="text-sm font-bold hover:text-gold-400"
            title="Recarregar a transmissão se ela travar"
          >
            Recarregar transmissão
          </button>
          <button
            onClick={goFullscreen}
            className="flex items-center gap-2 text-sm font-bold hover:text-gold-400"
            title="Tela cheia"
          >
            <Icon name="maximize" className="h-4 w-4" /> Tela cheia
          </button>
        </div>
      </div>
    </div>
  )
}
