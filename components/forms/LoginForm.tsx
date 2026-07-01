'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        return
      }

      if (result?.ok) {
        const callbackUrl = searchParams.get('callbackUrl') || '/app'
        router.push(callbackUrl)
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg border border-valeriote-gray-200 p-8">
        <h1 className="text-2xl font-bold text-valeriote-navy-950 mb-2">
          Bem-vindo
        </h1>
        <p className="text-valeriote-gray-600 mb-6">
          Faça login para acessar sua conta
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-valeriote-gray-900 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-valeriote-gray-300 rounded-lg focus:outline-none focus:border-valeriote-navy-950 focus:ring-2 focus:ring-valeriote-navy-950/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-valeriote-gray-900 mb-2">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-valeriote-gray-300 rounded-lg focus:outline-none focus:border-valeriote-navy-950 focus:ring-2 focus:ring-valeriote-navy-950/20"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-valeriote-navy-950 text-white py-2 rounded-lg font-medium hover:bg-valeriote-navy-900 disabled:opacity-50 transition"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-valeriote-gray-600 text-sm mt-6">
          Não tem conta?{' '}
          <Link
            href="/cadastro"
            className="font-medium text-valeriote-navy-950 hover:text-valeriote-navy-900"
          >
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
