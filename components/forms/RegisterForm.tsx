'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerUser } from '@/server/actions/auth-actions'
import Link from 'next/link'

export default function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const result = await registerUser({
        name,
        email,
        password,
        confirmPassword,
      })

      if (!result.success) {
        setError(result.error || 'Erro ao cadastrar')
        return
      }

      setSuccess(result.message || 'Cadastro realizado com sucesso!')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setError('Erro ao cadastrar. Tente novamente.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg border border-valeriote-gray-200 p-8">
        <h1 className="text-2xl font-bold text-valeriote-navy-950 mb-2">
          Criar Conta
        </h1>
        <p className="text-valeriote-gray-600 mb-6">
          Cadastre-se para acessar nossos cursos
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 mb-6 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-valeriote-gray-900 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-valeriote-gray-300 rounded-lg focus:outline-none focus:border-valeriote-navy-950 focus:ring-2 focus:ring-valeriote-navy-950/20"
            />
          </div>

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
            <p className="text-xs text-valeriote-gray-600 mt-1">
              Mínimo 6 caracteres, com letra maiúscula e número
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-valeriote-gray-900 mb-2">
              Confirmar Senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {isLoading ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center text-valeriote-gray-600 text-sm mt-6">
          Já tem conta?{' '}
          <Link
            href="/login"
            className="font-medium text-valeriote-navy-950 hover:text-valeriote-navy-900"
          >
            Faça login
          </Link>
        </p>
      </div>
    </div>
  )
}
