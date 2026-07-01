'use client'

import { useAuthGuard } from '@/features/auth/hooks/useAuthGuard'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { isLoading } = useAuthGuard()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-valeriote-navy-950 mx-auto mb-4"></div>
          <p className="text-valeriote-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-valeriote-gray-50">
      <nav className="bg-white border-b border-valeriote-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-valeriote-navy-950">
            Valeriote
          </div>
          <div>
            <a
              href="/api/auth/signout"
              className="text-valeriote-gray-600 hover:text-valeriote-navy-950 font-medium"
            >
              Sair
            </a>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
