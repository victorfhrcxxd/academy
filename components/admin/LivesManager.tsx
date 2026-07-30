'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  createLive,
  updateLive,
  setLiveStatus,
  deleteLive,
} from '@/server/actions/live-actions'
import { createTalk, updateTalk, deleteTalk } from '@/server/actions/talk-actions'
import { createMaterial, deleteMaterial } from '@/server/actions/material-actions'
import { sendReminderNow } from '@/server/actions/reminder-actions'
import { upload } from '@vercel/blob/client'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import AdminLiveMetrics from '@/components/admin/AdminLiveMetrics'
import Icon from '@/components/Icon'

interface Course {
  id: string
  title: string
}

interface Talk {
  id: string
  title: string
  speakerName: string | null
  speakerPhoto: string | null
  startsAt: string
  endsAt: string | null
  description: string | null
}

interface AttendanceRow {
  name: string
  email: string
  minutes: number
  lastSeenAt: string
}

interface MaterialRow {
  id: string
  title: string
  url: string
  size: number | null
}

interface Day {
  id: string
  courseId: string
  courseTitle: string
  title: string
  description: string | null
  scheduledAt: string
  endsAt: string | null
  embedUrl: string | null
  replayUrl: string | null
  restrictPlayer: boolean
  status: string
  talks: Talk[]
  attendances: AttendanceRow[]
  materials: MaterialRow[]
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

// datetime-local espera "YYYY-MM-DDTHH:mm" no horário local
function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Redimensiona a foto no navegador (máx. 320px) e devolve como data URL
function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const max = 320
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('Imagem inválida'))
    img.src = URL.createObjectURL(file)
  })
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm'
const labelCls = 'block text-sm font-medium text-navy-950 mb-1.5'

export default function LivesManager({
  days,
  courses,
}: {
  days: Day[]
  courses: Course[]
}) {
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // ---- formulário do DIA ----
  const [showDayForm, setShowDayForm] = useState(false)
  const [editingDay, setEditingDay] = useState<Day | null>(null)
  const [courseId, setCourseId] = useState('')
  const [dayTitle, setDayTitle] = useState('')
  const [dayDescription, setDayDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [replayUrl, setReplayUrl] = useState('')
  const [restrictPlayer, setRestrictPlayer] = useState(true)
  const [openPresence, setOpenPresence] = useState<string | null>(null)

  // ---- materiais ----
  const [openMaterials, setOpenMaterials] = useState<string | null>(null)
  const [matTitle, setMatTitle] = useState('')
  const [matFile, setMatFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // ---- programação (palestras) ----
  const [openProgram, setOpenProgram] = useState<string | null>(null)
  const [editingTalk, setEditingTalk] = useState<Talk | null>(null)
  const [showTalkForm, setShowTalkForm] = useState(false)
  const [tTitle, setTTitle] = useState('')
  const [tSpeaker, setTSpeaker] = useState('')
  const [tPhoto, setTPhoto] = useState('')
  const [tStart, setTStart] = useState('')
  const [tEnd, setTEnd] = useState('')
  const [tDesc, setTDesc] = useState('')

  const notify = (ok: boolean, text: string) => {
    setFeedback({ ok, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const openCreateDay = () => {
    setEditingDay(null)
    setCourseId(courses[0]?.id || '')
    setDayTitle(`Dia ${days.length + 1}`)
    setDayDescription('')
    setScheduledAt('')
    setEndsAt('')
    setEmbedUrl('')
    setReplayUrl('')
    setRestrictPlayer(true)
    setShowDayForm(true)
  }

  const openEditDay = (d: Day) => {
    setEditingDay(d)
    setCourseId(d.courseId)
    setDayTitle(d.title)
    setDayDescription(d.description || '')
    setScheduledAt(toLocalInputValue(d.scheduledAt))
    setEndsAt(d.endsAt ? toLocalInputValue(d.endsAt) : '')
    setEmbedUrl(d.embedUrl || '')
    setReplayUrl(d.replayUrl || '')
    setRestrictPlayer(d.restrictPlayer)
    setShowDayForm(true)
  }

  // aceita código embed colado inteiro (<iframe src="...">) e extrai só a URL
  const cleanUrl = (v: string) =>
    v.includes('<iframe') ? v.match(/src=["']([^"']+)["']/)?.[1] || v : v.trim()

  const submitDay = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const payload = {
        courseId,
        title: dayTitle,
        description: dayDescription || undefined,
        scheduledAt: new Date(scheduledAt),
        endsAt: endsAt ? new Date(endsAt) : undefined,
        embedUrl: cleanUrl(embedUrl) || '',
        replayUrl: cleanUrl(replayUrl) || '',
        restrictPlayer,
      }
      const res = editingDay
        ? await updateLive(editingDay.id, payload)
        : await createLive(payload)
      if (res.success) {
        notify(true, res.message || 'Salvo')
        setShowDayForm(false)
      } else {
        notify(false, res.error || 'Erro ao salvar')
      }
    })
  }

  const handleStatus = (d: Day, status: 'SCHEDULED' | 'LIVE' | 'ENDED') =>
    startTransition(async () => {
      const res = await setLiveStatus(d.id, status)
      if (!res.success) notify(false, res.error || 'Erro')
    })

  const handleDeleteDay = (d: Day) => {
    if (!confirm(`Excluir "${d.title}"? A programação e o chat desse dia também somem.`))
      return
    startTransition(async () => {
      const res = await deleteLive(d.id)
      notify(res.success, res.success ? 'Dia excluído' : res.error || 'Erro')
    })
  }

  // ---- palestras ----
  const openCreateTalk = (dayId: string) => {
    setEditingTalk(null)
    setTTitle('')
    setTSpeaker('')
    setTPhoto('')
    setTStart('')
    setTEnd('')
    setTDesc('')
    setOpenProgram(dayId)
    setShowTalkForm(true)
  }

  const openEditTalk = (dayId: string, t: Talk) => {
    setEditingTalk(t)
    setTTitle(t.title)
    setTSpeaker(t.speakerName || '')
    setTPhoto(t.speakerPhoto || '')
    setTStart(toLocalInputValue(t.startsAt))
    setTEnd(t.endsAt ? toLocalInputValue(t.endsAt) : '')
    setTDesc(t.description || '')
    setOpenProgram(dayId)
    setShowTalkForm(true)
  }

  const handleTalkPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setTPhoto(await resizePhoto(file))
    } catch {
      notify(false, 'Não foi possível ler a imagem')
    }
  }

  const submitTalk = (e: React.FormEvent, dayId: string) => {
    e.preventDefault()
    startTransition(async () => {
      const payload = {
        liveId: dayId,
        title: tTitle,
        speakerName: tSpeaker || undefined,
        speakerPhoto: tPhoto || '',
        startsAt: new Date(tStart),
        endsAt: tEnd ? new Date(tEnd) : undefined,
        description: tDesc || undefined,
      }
      const res = editingTalk
        ? await updateTalk(editingTalk.id, payload)
        : await createTalk(payload)
      if (res.success) {
        notify(true, res.message || 'Salvo')
        setShowTalkForm(false)
      } else {
        notify(false, res.error || 'Erro ao salvar palestra')
      }
    })
  }

  const handleDeleteTalk = (t: Talk) => {
    if (!confirm(`Remover a palestra "${t.title}" da programação?`)) return
    startTransition(async () => {
      const res = await deleteTalk(t.id)
      notify(res.success, res.success ? 'Palestra removida' : res.error || 'Erro')
    })
  }

  // ---- materiais ----
  const handleUploadMaterial = async (e: React.FormEvent, dayId: string) => {
    e.preventDefault()
    if (!matFile || uploading) return
    setUploading(true)
    try {
      const blob = await upload(matFile.name, matFile, {
        access: 'public',
        handleUploadUrl: '/api/materials/upload',
      })
      const res = await createMaterial({
        liveId: dayId,
        title: matTitle || matFile.name.replace(/\.[^.]+$/, ''),
        url: blob.url,
        size: matFile.size,
      })
      if (res.success) {
        notify(true, 'Material publicado')
        setMatTitle('')
        setMatFile(null)
      } else {
        notify(false, res.error || 'Erro ao salvar material')
      }
    } catch {
      notify(false, 'Falha no upload — tente novamente')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteMaterial = (m: MaterialRow) => {
    if (!confirm(`Remover o material "${m.title}"?`)) return
    startTransition(async () => {
      const res = await deleteMaterial(m.id)
      notify(res.success, res.success ? 'Material removido' : res.error || 'Erro')
    })
  }

  const handleSendReminder = (d: Day) => {
    if (
      !confirm(
        `Enviar o email de lembrete de "${d.title}" AGORA para todos os alunos matriculados?`
      )
    )
      return
    startTransition(async () => {
      const res = await sendReminderNow(d.id)
      notify(res.success, res.success ? res.message || 'Lembretes enviados' : res.error || 'Erro')
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Transmissões</h1>
          <p className="text-sm text-gray-500">
            Um dia do evento = uma transmissão ao vivo. Dentro de cada dia, monte a
            programação de palestras.
          </p>
        </div>
        <button
          onClick={openCreateDay}
          disabled={courses.length === 0}
          className="rounded-lg bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-sm font-bold text-navy-950 transition disabled:opacity-50"
        >
          + Agendar dia
        </button>
      </div>

      {courses.length === 0 && (
        <p className="mb-4 text-sm text-gray-500">
          Crie um curso primeiro para poder agendar os dias do evento.
        </p>
      )}

      {feedback && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            feedback.ok
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {showDayForm && (
        <form
          onSubmit={submitDay}
          className="mb-8 rounded-2xl bg-white border border-gray-200 p-6 grid gap-4 md:grid-cols-2"
        >
          <div>
            <label className={labelCls}>Curso</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
              className={`${inputCls} bg-white`}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Título do dia</label>
            <input
              value={dayTitle}
              onChange={(e) => setDayTitle(e.target.value)}
              required
              className={inputCls}
              placeholder="Ex.: Dia 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Início</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Término</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                min={scheduledAt || undefined}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Link da transmissão (opcional)</label>
            <input
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              className={inputCls}
              placeholder="https://www.youtube.com/watch?v=... (pode colar depois)"
            />
            <p className="text-xs text-gray-400 mt-1">
              Aceita link normal do YouTube/Vimeo (convertemos sozinhos) ou o código
              embed completo de plataformas como Panda Video — colamos e extraímos a URL.
            </p>
          </div>
          <div>
            <label className={labelCls}>Link da gravação / replay (opcional)</label>
            <input
              value={replayUrl}
              onChange={(e) => setReplayUrl(e.target.value)}
              className={inputCls}
              placeholder="Cole depois que o dia terminar"
            />
            <p className="text-xs text-gray-400 mt-1">
              Quando o dia estiver <b>Encerrado</b> e este link preenchido, o aluno vê a
              gravação no lugar da transmissão (botão &quot;Assistir gravação&quot;).
            </p>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Descrição (opcional)</label>
            <textarea
              value={dayDescription}
              onChange={(e) => setDayDescription(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={restrictPlayer}
                onChange={(e) => setRestrictPlayer(e.target.checked)}
                className="mt-1 h-4 w-4 accent-navy-950"
              />
              <span className="text-sm">
                <span className="font-medium text-navy-950">
                  Player protegido (recomendado)
                </span>
                <span className="block text-xs text-gray-500">
                  Esconde o título e os controles do YouTube e impede o aluno de pausar
                  ou clicar no vídeo. O aluno usa os controles da plataforma (som,
                  volume, tela cheia). Vale só para links do YouTube.
                </span>
              </span>
            </label>
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-navy-950 hover:bg-navy-900 px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
            >
              {isPending ? 'Salvando...' : editingDay ? 'Salvar alterações' : 'Agendar dia'}
            </button>
            <button
              type="button"
              onClick={() => setShowDayForm(false)}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {days.length === 0 && (
          <p className="text-gray-500 text-sm">Nenhum dia agendado ainda.</p>
        )}
        {days.map((d) => (
          <div key={d.id} className="rounded-2xl bg-white border border-gray-200">
            <div className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-bold text-navy-950 truncate">{d.title}</p>
                  <LiveStatusBadge status={d.status} />
                </div>
                <p className="text-sm text-gray-500">
                  {d.courseTitle} · {dateFormatter.format(new Date(d.scheduledAt))}
                  {d.endsAt && <> às {timeFormatter.format(new Date(d.endsAt))}</>}
                  {!d.embedUrl && (
                    <span className="ml-2 text-amber-600 font-medium">· sem link ainda</span>
                  )}
                  {d.replayUrl && (
                    <span className="ml-2 text-green-700 font-medium">· gravação ok</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <Link
                  href={`/aulas/live/${d.id}`}
                  className="flex items-center gap-1.5 rounded-lg bg-navy-950 text-white px-3 py-1.5 hover:bg-navy-900"
                >
                  <Icon name="play" className="h-3 w-3" /> Assistir
                </Link>
                {d.status !== 'LIVE' && (
                  <button
                    onClick={() => handleStatus(d, 'LIVE')}
                    className="rounded-lg bg-red-600 text-white px-3 py-1.5 hover:bg-red-700"
                  >
                    ● Iniciar
                  </button>
                )}
                {d.status === 'LIVE' && (
                  <button
                    onClick={() => handleStatus(d, 'ENDED')}
                    className="rounded-lg bg-gray-700 text-white px-3 py-1.5 hover:bg-gray-800"
                  >
                    Encerrar
                  </button>
                )}
                {d.status === 'ENDED' && (
                  <button
                    onClick={() => handleStatus(d, 'SCHEDULED')}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
                  >
                    Reagendar
                  </button>
                )}
                <button
                  onClick={() => openEditDay(d)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteDay(d)}
                  className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 hover:bg-red-50"
                >
                  Excluir
                </button>
                <button
                  onClick={() => {
                    setOpenProgram(openProgram === d.id ? null : d.id)
                    setShowTalkForm(false)
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-navy-600/40 text-navy-900 px-3 py-1.5 hover:bg-navy-900/5"
                >
                  <Icon name="calendar" className="h-3.5 w-3.5" /> Programação ({d.talks.length})
                </button>
                <button
                  onClick={() => setOpenPresence(openPresence === d.id ? null : d.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-navy-600/40 text-navy-900 px-3 py-1.5 hover:bg-navy-900/5"
                >
                  <Icon name="users" className="h-3.5 w-3.5" /> Presenças ({d.attendances.length})
                </button>
                <button
                  onClick={() => {
                    setOpenMaterials(openMaterials === d.id ? null : d.id)
                    setMatTitle('')
                    setMatFile(null)
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-navy-600/40 text-navy-900 px-3 py-1.5 hover:bg-navy-900/5"
                >
                  <Icon name="paperclip" className="h-3.5 w-3.5" /> Materiais ({d.materials.length})
                </button>
                <button
                  onClick={() => handleSendReminder(d)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-gold-600/50 text-gold-600 px-3 py-1.5 hover:bg-gold-500/10 disabled:opacity-50"
                  title="Enviar email de lembrete agora pra todos os alunos matriculados"
                >
                  <Icon name="megaphone" className="h-3.5 w-3.5" /> Lembrete
                </button>
              </div>
            </div>

            {openMaterials === d.id && (
              <div className="border-t border-gray-100 p-5">
                <p className="text-xs font-bold uppercase text-gray-400 mb-3">
                  Materiais de {d.title}
                </p>

                <form
                  onSubmit={(e) => handleUploadMaterial(e, d.id)}
                  className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex-1 min-w-[200px]">
                    <label className={labelCls}>Título</label>
                    <input
                      value={matTitle}
                      onChange={(e) => setMatTitle(e.target.value)}
                      className={inputCls}
                      placeholder="Ex.: Slides — Fiscalização de contratos"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Arquivo (PDF, slides, zip...)</label>
                    <input
                      type="file"
                      accept=".pdf,.zip,.pptx,.docx,.xlsx,.png,.jpg,.jpeg"
                      onChange={(e) => setMatFile(e.target.files?.[0] || null)}
                      className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-950 file:px-3 file:py-1.5 file:text-white file:text-xs file:font-bold file:cursor-pointer"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={uploading || !matFile}
                    className="rounded-lg bg-gold-500 hover:bg-gold-600 px-4 py-2 text-sm font-bold text-navy-950 transition disabled:opacity-50"
                  >
                    {uploading ? 'Enviando...' : 'Publicar'}
                  </button>
                </form>

                {d.materials.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum material publicado ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {d.materials.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-2.5"
                      >
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-navy-900 hover:underline truncate"
                        >
                          <Icon name="file-text" className="inline h-4 w-4 mr-1 text-gray-400" />
                          {m.title}
                          {m.size ? (
                            <span className="text-gray-400 font-normal"> · {formatSize(m.size)}</span>
                          ) : null}
                        </a>
                        <button
                          onClick={() => handleDeleteMaterial(m)}
                          className="rounded-lg border border-red-200 text-red-600 px-2.5 py-1.5 text-xs font-medium hover:bg-red-50 shrink-0"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {openPresence === d.id && (
              <div className="border-t border-gray-100 p-5">
                <p className="text-xs font-bold uppercase text-gray-400 mb-3">
                  Presenças em {d.title}
                </p>
                <AdminLiveMetrics liveId={d.id} />
                {d.attendances.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nenhum aluno assistiu a este dia ainda.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="py-2 pr-4 font-medium">Aluno</th>
                          <th className="py-2 pr-4 font-medium">Tempo assistido</th>
                          <th className="py-2 font-medium">Visto por último</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {d.attendances.map((a) => (
                          <tr key={a.email}>
                            <td className="py-2 pr-4">
                              <p className="font-medium text-navy-950">{a.name}</p>
                              <p className="text-gray-500 text-xs">{a.email}</p>
                            </td>
                            <td className="py-2 pr-4 font-medium text-navy-950">
                              {a.minutes < 60
                                ? `${a.minutes} min`
                                : `${Math.floor(a.minutes / 60)}h${String(a.minutes % 60).padStart(2, '0')}`}
                            </td>
                            <td className="py-2 text-gray-500">
                              {dateFormatter.format(new Date(a.lastSeenAt))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {openProgram === d.id && (
              <div className="border-t border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold uppercase text-gray-400">
                    Programação de {d.title}
                  </p>
                  <button
                    onClick={() => openCreateTalk(d.id)}
                    className="rounded-lg bg-gold-500 hover:bg-gold-600 px-3 py-1.5 text-xs font-bold text-navy-950"
                  >
                    + Adicionar palestra
                  </button>
                </div>

                {showTalkForm && openProgram === d.id && (
                  <form
                    onSubmit={(e) => submitTalk(e, d.id)}
                    className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4 grid gap-3 md:grid-cols-2"
                  >
                    <div>
                      <label className={labelCls}>Tema da palestra</label>
                      <input
                        value={tTitle}
                        onChange={(e) => setTTitle(e.target.value)}
                        required
                        className={inputCls}
                        placeholder="Ex.: Fiscalização de contratos na prática"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Professor palestrante</label>
                      <input
                        value={tSpeaker}
                        onChange={(e) => setTSpeaker(e.target.value)}
                        className={inputCls}
                        placeholder="Ex.: Jacoby Fernandes"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Início</label>
                        <input
                          type="datetime-local"
                          value={tStart}
                          onChange={(e) => setTStart(e.target.value)}
                          required
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Término</label>
                        <input
                          type="datetime-local"
                          value={tEnd}
                          onChange={(e) => setTEnd(e.target.value)}
                          min={tStart || undefined}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Foto do palestrante</label>
                      <div className="flex items-center gap-3">
                        {tPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={tPhoto}
                            alt="Foto do palestrante"
                            className="h-12 w-12 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                            <Icon name="user" className="h-5 w-5" />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleTalkPhoto}
                          className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-950 file:px-3 file:py-1.5 file:text-white file:text-xs file:font-bold file:cursor-pointer"
                        />
                        {tPhoto && (
                          <button
                            type="button"
                            onClick={() => setTPhoto('')}
                            className="text-xs text-red-600 hover:underline"
                          >
                            remover
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls}>Descrição (opcional)</label>
                      <textarea
                        value={tDesc}
                        onChange={(e) => setTDesc(e.target.value)}
                        rows={2}
                        className={inputCls}
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-3">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-lg bg-navy-950 hover:bg-navy-900 px-5 py-2 text-sm font-bold text-white transition disabled:opacity-60"
                      >
                        {isPending
                          ? 'Salvando...'
                          : editingTalk
                            ? 'Salvar alterações'
                            : 'Adicionar palestra'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTalkForm(false)}
                        className="rounded-lg border border-gray-300 px-5 py-2 text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {d.talks.length === 0 && !showTalkForm && (
                  <p className="text-sm text-gray-500">
                    Nenhuma palestra na programação deste dia ainda.
                  </p>
                )}

                <div className="space-y-3">
                  {d.talks.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {t.speakerPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.speakerPhoto}
                            alt={t.speakerName || 'Palestrante'}
                            className="h-10 w-10 rounded-full object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                            <Icon name="user" className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy-950 truncate">
                            {t.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t.speakerName && <span>{t.speakerName} · </span>}
                            {timeFormatter.format(new Date(t.startsAt))}
                            {t.endsAt && <> – {timeFormatter.format(new Date(t.endsAt))}</>}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 text-xs font-medium">
                        <button
                          onClick={() => openEditTalk(d.id, t)}
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5 hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteTalk(t)}
                          className="rounded-lg border border-red-200 text-red-600 px-2.5 py-1.5 hover:bg-red-50"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
