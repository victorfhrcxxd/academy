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
  scheduledAt: string
  embedUrl: string | null
  status: string
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
    setScheduledAt('')
    setEmbedUrl('')
    setShowForm(true)
  }

  const openEdit = (l: Live) => {
    setEditing(l)
    setCourseId(l.courseId)
    setTitle(l.title)
    setDescription(l.description || '')
    setScheduledAt(toLocalInputValue(l.scheduledAt))
    setEmbedUrl(l.embedUrl || '')
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const payload = {
        courseId,
        title,
        description: description || undefined,
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
    if (!confirm(`Excluir a aula "${l.title}"?`)) return
    startTransition(async () => {
      const res = await deleteLive(l.id)
      notify(res.success, res.success ? 'Aula excluída' : res.error || 'Erro')
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Aulas ao vivo</h1>
          <p className="text-sm text-gray-500">
            Agende as transmissões e cole o link da plataforma quando for transmitir.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={courses.length === 0}
          className="rounded-lg bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-sm font-bold text-navy-950 transition disabled:opacity-50"
        >
          + Agendar aula
        </button>
      </div>

      {courses.length === 0 && (
        <p className="mb-4 text-sm text-gray-500">
          Crie um curso primeiro para poder agendar aulas.
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
              Título da aula
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Ex.: Aula 01 — Introdução"
            />
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
              placeholder="https://www.youtube.com/embed/... (pode colar depois)"
            />
            <p className="text-xs text-gray-400 mt-1">
              Cole aqui o link de incorporação (embed) da plataforma que você usar —
              YouTube, Vimeo, etc. Dá pra deixar vazio e preencher na hora.
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
              {isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Agendar aula'}
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
          <p className="text-gray-500 text-sm">Nenhuma aula agendada ainda.</p>
        )}
        {lives.map((l) => (
          <div
            key={l.id}
            className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <p className="font-bold text-navy-950 truncate">{l.title}</p>
                <LiveStatusBadge status={l.status} />
              </div>
              <p className="text-sm text-gray-500">
                {l.courseTitle} · {dateFormatter.format(new Date(l.scheduledAt))}
                {!l.embedUrl && (
                  <span className="ml-2 text-amber-600 font-medium">· sem link ainda</span>
                )}
              </p>
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
