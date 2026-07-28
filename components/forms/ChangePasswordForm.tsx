'use client'

import { useState } from 'react'
import { changeOwnPassword } from '@/server/actions/profile-actions'

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    if (next !== confirm) {
      setFeedback({ ok: false, text: 'As senhas não conferem' })
      return
    }
    setIsLoading(true)
    const res = await changeOwnPassword(current, next)
    setIsLoading(false)
    setFeedback({
      ok: res.success,
      text: res.success ? res.message || 'Senha alterada!' : res.error || 'Erro',
    })
    if (res.success) {
      setCurrent('')
      setNext('')
      setConfirm('')
    }
  }

  const inputCls =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-navy-900 focus:ring-2 focus:ring-navy-900/15'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            feedback.ok
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-navy-950 mb-1.5">Senha atual</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          disabled={isLoading}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-navy-950 mb-1.5">Nova senha</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          minLength={6}
          required
          disabled={isLoading}
          placeholder="Mínimo 6 caracteres"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-navy-950 mb-1.5">
          Confirmar nova senha
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={6}
          required
          disabled={isLoading}
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-navy-950 hover:bg-navy-900 px-6 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
      >
        {isLoading ? 'Salvando...' : 'Salvar nova senha'}
      </button>
    </form>
  )
}
