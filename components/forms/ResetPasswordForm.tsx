'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resetPassword } from '@/server/actions/password-reset-actions'

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('As senhas não conferem')
      return
    }
    setIsLoading(true)
    const res = await resetPassword(token, password)
    setIsLoading(false)
    if (res.success) {
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } else {
      setError(res.error || 'Erro ao redefinir')
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-3xl mb-3">✅</p>
        <p className="font-semibold text-navy-950 mb-1">Senha redefinida!</p>
        <p className="text-sm text-gray-500">Te levando pro login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-navy-950 mb-1.5">Nova senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
          disabled={isLoading}
          placeholder="Mínimo 6 caracteres"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-navy-900 focus:ring-2 focus:ring-navy-900/15"
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
          placeholder="Repita a senha"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-navy-900 focus:ring-2 focus:ring-navy-900/15"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gold-500 hover:bg-gold-600 text-navy-950 py-2.5 rounded-lg font-bold text-sm disabled:opacity-60 transition"
      >
        {isLoading ? 'Salvando...' : 'Salvar nova senha'}
      </button>
    </form>
  )
}
