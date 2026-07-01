'use client'

import { useAuth } from '@/features/auth/hooks/useAuth'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-4xl font-bold text-valeriote-navy-950 mb-2">
        Bem-vindo, {user?.name}! 👋
      </h1>
      <p className="text-valeriote-gray-600 mb-12">
        Você está autenticado como: <strong>{user?.role === 'STUDENT' ? 'Aluno' : 'Administrador'}</strong>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-valeriote-gray-200 p-6">
          <h3 className="text-lg font-bold text-valeriote-navy-950 mb-2">
            Meus Cursos
          </h3>
          <p className="text-valeriote-gray-600 mb-4">
            Acesse seus cursos e continue aprendendo
          </p>
          <a
            href="/app/meus-cursos"
            className="text-valeriote-navy-950 font-medium hover:text-valeriote-navy-900"
          >
            Ver Cursos →
          </a>
        </div>

        <div className="bg-white rounded-lg border border-valeriote-gray-200 p-6">
          <h3 className="text-lg font-bold text-valeriote-navy-950 mb-2">
            Perfil
          </h3>
          <p className="text-valeriote-gray-600 mb-4">
            Veja e edite seus dados pessoais
          </p>
          <a
            href="/app/perfil"
            className="text-valeriote-navy-950 font-medium hover:text-valeriote-navy-900"
          >
            Acessar Perfil →
          </a>
        </div>

        <div className="bg-white rounded-lg border border-valeriote-gray-200 p-6">
          <h3 className="text-lg font-bold text-valeriote-navy-950 mb-2">
            Minhas Compras
          </h3>
          <p className="text-valeriote-gray-600 mb-4">
            Veja seu histórico de compras
          </p>
          <a
            href="/app/compras"
            className="text-valeriote-navy-950 font-medium hover:text-valeriote-navy-900"
          >
            Ver Compras →
          </a>
        </div>
      </div>
    </div>
  )
}
