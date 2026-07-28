'use client'

import { useState, useTransition } from 'react'
import {
  createLive,
  updateLive,
  setLiveStatus,
  deleteLive,
} from '@/server/actions/live-actions'
import LiveStatusBadge from '@/components/LiveStatusBadge'

interface Course {
  id: string
  title: string
}

interface Live {
  id: string
  courseId: string
  courseTitle: string
  title: string
  description: string | null
  speakerName: string | null
  speakerPhoto: string | null
  scheduledAt: string
  embedUrl: string | null
  status: string
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

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

// datetime-local espera "YYYY-MM-DDTHH:mm" no horário local
function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function LivesManager({
  lives,
  courses,
}: {
  lives: Live[]
  courses: Course[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Live | null>(null)
  const [courseId, setCourseId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [speakerName, setSpeakerName] = useState('')
  const [speakerPhoto, setSpeakerPhoto] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const notify = (ok: boolean, text: string) => {
    setFeedback({ ok, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const openCreate = () => {
    setEditing(null)
    setCourseId(courses[0]?.id || '')
    setTitle('')
    setDescription('')
    setSpeakerName('')
    setSpeakerPhoto('')
    setScheduledAt('')
    setEmbedUrl('')
    setShowForm(true)
  }

  const openEdit = (l: Live) => {
    setEditing(l)
    setCourseId(l.courseId)
    setTitle(l.title)
    setDescription(l.description || '')
    setSpeakerName(l.speakerName || '')
    setSpeakerPhoto(l.speakerPhoto || '')
    setScheduledAt(toLocalInputValue(l.scheduledAt))
    setEmbedUrl(l.embedUrl || '')
    setShowForm(true)
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setSpeakerPhoto(await resizePhoto(file))
    } catch {
      notify(false, 'Não foi possível ler a imagem')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const payload = {
        courseId,
        title,
        description: description || undefined,
        speakerName: speakerName || undefined,
        speakerPhoto: speakerPhoto || '',
        scheduledAt: new Date(scheduledAt),
        embedUrl: embedUrl || '',
      }
      const res = editing ? await updateLive(editing.id, payload) : await createLive(payload)
      if (res.success) {
        notify(true, res.message || 'Salvo')
        setShowForm(false)
      } else {
        notify(false, res.error || 'Erro ao salvar')
      }
    })
  }

  const handleStatus = (l: Live, status: 'SCHEDULED' | 'LIVE' | 'ENDED') =>
    startTransition(async () => {
      const res = await setLiveStatus(l.id, status)
      if (!res.success) notify(false, res.error || 'Erro')
    })

  const handleDelete = (l: Live) => {
    if (!confirm(`Excluir a palestra "${l.title}"?`)) return
    startTransition(async () => {
      const res = await deleteLive(l.id)
      notify(res.success, res.success ? 'Palestra excluída' : res.error || 'Erro')
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Palestras ao vivo</h1>
          <p className="text-sm text-gray-500">
            Agende as palestras do evento e cole o link da transmissão quando for transmitir.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={courses.length === 0}
          className="rounded-lg bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-sm font-bold text-navy-950 transition disabled:opacity-50"
        >
          + Agendar palestra
        </button>
      </div>

      {courses.length === 0 && (
        <p className="mb-4 text-sm text-gray-500">
          Crie um curso primeiro para poder agendar palestras.
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

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-2xl bg-white border border-gray-200 p-6 grid gap-4 md:grid-cols-2"
        >
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">Curso</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">
              Tema da palestra
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Ex.: Fiscalização de contratos na prática"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">
              Professor palestrante
            </label>
            <input
              value={speakerName}
              onChange={(e) => setSpeakerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Ex.: Jacoby Fernandes"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">
              Foto do palestrante
            </label>
            <div className="flex items-center gap-3">
              {speakerPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={speakerPhoto}
                  alt="Foto do palestrante"
                  className="h-12 w-12 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                  👤
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-950 file:px-3 file:py-1.5 file:text-white file:text-xs file:font-bold file:cursor-pointer"
              />
              {speakerPhoto && (
                <button
                  type="button"
                  onClick={() => setSpeakerPhoto('')}
                  className="text-xs text-red-600 hover:underline"
                >
                  remover
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">
              Data e hora
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">
              Link da transmissão (opcional)
            </label>
            <input
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="https://www.youtube.com/watch?v=... (pode colar depois)"
            />
            <p className="text-xs text-gray-400 mt-1">
              Pode colar o link normal do YouTube ou Vimeo (do jeito que copiar do
              navegador) — a plataforma converte sozinha pro formato do player.
              Dá pra deixar vazio e preencher na hora.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-navy-950 mb-1.5">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-navy-950 hover:bg-navy-900 px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
            >
              {isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Agendar palestra'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {lives.length === 0 && (
          <p className="text-gray-500 text-sm">Nenhuma palestra agendada ainda.</p>
        )}
        {lives.map((l) => (
          <div
            key={l.id}
            className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              {l.speakerPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={l.speakerPhoto}
                  alt={l.speakerName || 'Palestrante'}
                  className="h-12 w-12 rounded-full object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                  👤
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-bold text-navy-950 truncate">{l.title}</p>
                  <LiveStatusBadge status={l.status} />
                </div>
                <p className="text-sm text-gray-500">
                  {l.speakerName && <span className="font-medium">{l.speakerName} · </span>}
                  {l.courseTitle} · {dateFormatter.format(new Date(l.scheduledAt))}
                  {!l.embedUrl && (
                    <span className="ml-2 text-amber-600 font-medium">· sem link ainda</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              {l.status !== 'LIVE' && (
                <button
                  onClick={() => handleStatus(l, 'LIVE')}
                  className="rounded-lg bg-red-600 text-white px-3 py-1.5 hover:bg-red-700"
                >
                  ● Iniciar
                </button>
              )}
              {l.status === 'LIVE' && (
                <button
                  onClick={() => handleStatus(l, 'ENDED')}
                  className="rounded-lg bg-gray-700 text-white px-3 py-1.5 hover:bg-gray-800"
                >
                  Encerrar
                </button>
              )}
              {l.status === 'ENDED' && (
                <button
                  onClick={() => handleStatus(l, 'SCHEDULED')}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
                >
                  Reagendar
                </button>
              )}
              <button
                onClick={() => openEdit(l)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(l)}
                className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 hover:bg-red-50"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
