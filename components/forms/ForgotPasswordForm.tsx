'use client'

import { useState } from 'react'
import { requestPasswordReset } from '@/server/actions/password-reset-actions'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFeedback(null)
    const res = await requestPasswordReset(email)
    setFeedback({
      ok: res.success,
      text: res.success ? res.message || 'Email enviado!' : res.error || 'Erro',
    })
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <label className="block text-sm font-medium text-navy-950 mb-1.5">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          disabled={isLoading}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-navy-900 focus:ring-2 focus:ring-navy-900/15"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gold-500 hover:bg-gold-600 text-navy-950 py-2.5 rounded-lg font-bold text-sm disabled:opacity-60 transition"
      >
        {isLoading ? 'Enviando...' : 'Enviar link de redefinição'}
      </button>
    </form>
  )
}
