'use client'

import { useState, useTransition } from 'react'
import {
  createCourse,
  updateCourse,
  toggleCourseStatus,
  deleteCourse,
} from '@/server/actions/course-actions'

interface Course {
  id: string
  title: string
  description: string | null
  status: string
  priceCents: number | null
  registrationOpen: boolean
  students: number
  lives: number
}

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CoursesManager({ courses }: { courses: Course[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('') // em reais, ex.: "497,00"
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const notify = (ok: boolean, text: string) => {
    setFeedback({ ok, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const openCreate = () => {
    setEditing(null)
    setTitle('')
    setDescription('')
    setPrice('')
    setRegistrationOpen(false)
    setShowForm(true)
  }

  const openEdit = (c: Course) => {
    setEditing(c)
    setTitle(c.title)
    setDescription(c.description || '')
    setPrice(c.priceCents != null ? (c.priceCents / 100).toFixed(2).replace('.', ',') : '')
    setRegistrationOpen(c.registrationOpen)
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const priceCents = price.trim()
      ? Math.round(Number(price.replace(/\./g, '').replace(',', '.')) * 100)
      : null
    if (price.trim() && (!Number.isFinite(priceCents) || priceCents! <= 0)) {
      notify(false, 'Preço inválido')
      return
    }
    if (registrationOpen && priceCents == null) {
      notify(false, 'Defina o preço para abrir as inscrições')
      return
    }
    startTransition(async () => {
      const payload = {
        title,
        description: description || undefined,
        priceCents,
        registrationOpen,
      }
      const res = editing
        ? await updateCourse(editing.id, payload)
        : await createCourse(payload)
      if (res.success) {
        notify(true, res.message || 'Salvo')
        setShowForm(false)
      } else {
        notify(false, res.error || 'Erro ao salvar')
      }
    })
  }

  const handleToggle = (c: Course) =>
    startTransition(async () => {
      const res = await toggleCourseStatus(c.id)
      if (!res.success) notify(false, res.error || 'Erro')
    })

  const handleDelete = (c: Course) => {
    if (
      !confirm(
        `Excluir o curso "${c.title}"? As matrículas e aulas dele também serão removidas.`
      )
    )
      return
    startTransition(async () => {
      const res = await deleteCourse(c.id)
      notify(res.success, res.success ? 'Curso excluído' : res.error || 'Erro')
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Cursos</h1>
          <p className="text-sm text-gray-500">
            Cada curso presencial vira uma turma aqui, com sua agenda de lives.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-sm font-bold text-navy-950 transition"
        >
          + Novo curso
        </button>
      </div>

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
          className="mb-8 rounded-2xl bg-white border border-gray-200 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">
              Título do curso
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Ex.: Turma Presencial — Julho/2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <label className="block text-sm font-medium text-navy-950 mb-1.5">
                Preço da inscrição (R$)
              </label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Ex.: 497,00"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-navy-950 pb-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={registrationOpen}
                onChange={(e) => setRegistrationOpen(e.target.checked)}
                className="h-4 w-4 accent-gold-500"
              />
              Inscrições abertas (LP / pagamento Asaas)
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-navy-950 hover:bg-navy-900 px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
            >
              {isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar curso'}
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

      <div className="grid gap-4 md:grid-cols-2">
        {courses.length === 0 && (
          <p className="text-gray-500 text-sm">Nenhum curso criado ainda.</p>
        )}
        {courses.map((c) => (
          <div key={c.id} className="rounded-2xl bg-white border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="font-bold text-navy-950">{c.title}</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold shrink-0 ${
                  c.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {c.status === 'ACTIVE' ? 'Ativo' : 'Arquivado'}
              </span>
            </div>
            {c.description && (
              <p className="text-sm text-gray-500 mb-3">{c.description}</p>
            )}
            <p className="text-sm text-gray-600 mb-4">
              {c.students} aluno{c.students === 1 ? '' : 's'} · {c.lives} dia
              {c.lives === 1 ? '' : 's'} de transmissão
              {c.priceCents != null && <> · {formatPrice(c.priceCents)}</>}
              {c.registrationOpen && (
                <span className="ml-2 rounded-full bg-gold-100 text-gold-700 px-2 py-0.5 text-xs font-bold">
                  Inscrições abertas
                </span>
              )}
            </p>
            <div className="flex gap-2 text-xs font-medium">
              <button
                onClick={() => openEdit(c)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
              >
                Editar
              </button>
              <button
                onClick={() => handleToggle(c)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
              >
                {c.status === 'ACTIVE' ? 'Arquivar' : 'Reativar'}
              </button>
              <button
                onClick={() => handleDelete(c)}
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
