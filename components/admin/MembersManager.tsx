'use client'

import { useState, useTransition } from 'react'
import {
  createMember,
  toggleMemberStatus,
  setMemberEnrollments,
  resetMemberPassword,
  deleteMember,
} from '@/server/actions/member-actions'

interface Course {
  id: string
  title: string
}

interface Member {
  id: string
  name: string
  email: string
  status: string
  createdAt: string
  courseIds: string[]
}

export default function MembersManager({
  members,
  courses,
}: {
  members: Member[]
  courses: Course[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // formulário de novo aluno
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])

  // edição de matrículas
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editCourses, setEditCourses] = useState<string[]>([])

  const notify = (ok: boolean, text: string) => {
    setFeedback({ ok, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await createMember({ name, email, password, courseIds: selectedCourses })
      if (res.success) {
        notify(true, res.message || 'Aluno cadastrado')
        setName('')
        setEmail('')
        setPassword('')
        setSelectedCourses([])
        setShowForm(false)
      } else {
        notify(false, res.error || 'Erro ao cadastrar')
      }
    })
  }

  const handleToggle = (id: string) =>
    startTransition(async () => {
      const res = await toggleMemberStatus(id)
      if (!res.success) notify(false, res.error || 'Erro')
    })

  const handleDelete = (m: Member) => {
    if (!confirm(`Excluir o aluno ${m.name}? Essa ação não pode ser desfeita.`)) return
    startTransition(async () => {
      const res = await deleteMember(m.id)
      notify(res.success, res.success ? 'Aluno excluído' : res.error || 'Erro')
    })
  }

  const handleResetPassword = (m: Member) => {
    const nova = prompt(`Nova senha para ${m.name} (mín. 6 caracteres):`)
    if (!nova) return
    startTransition(async () => {
      const res = await resetMemberPassword(m.id, nova)
      notify(res.success, res.success ? 'Senha redefinida' : res.error || 'Erro')
    })
  }

  const openEnrollments = (m: Member) => {
    setEditingMember(m)
    setEditCourses(m.courseIds)
  }

  const saveEnrollments = () => {
    if (!editingMember) return
    startTransition(async () => {
      const res = await setMemberEnrollments(editingMember.id, editCourses)
      notify(res.success, res.success ? 'Matrículas atualizadas' : res.error || 'Erro')
      if (res.success) setEditingMember(null)
    })
  }

  const toggleInList = (list: string[], id: string) =>
    list.includes(id) ? list.filter((c) => c !== id) : [...list, id]

  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title || '—'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Alunos</h1>
          <p className="text-sm text-gray-500">
            Cadastre quem já fez a inscrição e libere o acesso às palestras ao vivo.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-sm font-bold text-navy-950 transition"
        >
          {showForm ? 'Fechar' : '+ Cadastrar aluno'}
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
          onSubmit={handleCreate}
          className="mb-8 rounded-2xl bg-white border border-gray-200 p-6 grid gap-4 md:grid-cols-2"
        >
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">
              Senha inicial
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-950 mb-1.5">
              Cursos liberados
            </label>
            <div className="flex flex-wrap gap-2">
              {courses.length === 0 && (
                <p className="text-sm text-gray-500">
                  Nenhum curso criado ainda — crie em &quot;Cursos&quot;.
                </p>
              )}
              {courses.map((c) => (
                <label
                  key={c.id}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                    selectedCourses.includes(c.id)
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedCourses.includes(c.id)}
                    onChange={() => setSelectedCourses((l) => toggleInList(l, c.id))}
                  />
                  {c.title}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-navy-950 hover:bg-navy-900 px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
            >
              {isPending ? 'Salvando...' : 'Cadastrar aluno'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl bg-white border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Aluno</th>
              <th className="px-5 py-3 font-medium">Cursos</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-gray-500">
                  Nenhum aluno cadastrado ainda.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3">
                  <p className="font-medium text-navy-950">{m.name}</p>
                  <p className="text-gray-500">{m.email}</p>
                </td>
                <td className="px-5 py-3">
                  {m.courseIds.length === 0 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {m.courseIds.map((id) => (
                        <span
                          key={id}
                          className="rounded-full bg-navy-900/10 text-navy-900 px-2 py-0.5 text-xs"
                        >
                          {courseTitle(id)}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      m.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {m.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2 text-xs font-medium">
                    <button
                      onClick={() => openEnrollments(m)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1.5 hover:bg-gray-50"
                    >
                      Matrículas
                    </button>
                    <button
                      onClick={() => handleResetPassword(m)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1.5 hover:bg-gray-50"
                    >
                      Senha
                    </button>
                    <button
                      onClick={() => handleToggle(m.id)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1.5 hover:bg-gray-50"
                    >
                      {m.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      className="rounded-lg border border-red-200 text-red-600 px-2.5 py-1.5 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de matrículas */}
      {editingMember && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setEditingMember(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-navy-950 mb-1">Matrículas</h3>
            <p className="text-sm text-gray-500 mb-4">
              {editingMember.name} — marque os cursos liberados
            </p>
            <div className="space-y-2 mb-6">
              {courses.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={editCourses.includes(c.id)}
                    onChange={() => setEditCourses((l) => toggleInList(l, c.id))}
                  />
                  <span className="text-sm text-navy-950">{c.title}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingMember(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={saveEnrollments}
                disabled={isPending}
                className="rounded-lg bg-navy-950 text-white px-4 py-2 text-sm font-bold disabled:opacity-60"
              >
                {isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
