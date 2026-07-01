'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './useAuth'

type RequiredRole = 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN'

export function useAuthGuard(requiredRole?: RequiredRole) {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (requiredRole && user?.role !== requiredRole) {
      // Se precisa de ADMIN mas usuário é STUDENT
      if (requiredRole === 'ADMIN' && !['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) {
        router.push('/app')
        return
      }

      if (requiredRole === 'SUPER_ADMIN' && user?.role !== 'SUPER_ADMIN') {
        router.push('/app')
        return
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router])

  return { user, isLoading, isAuthenticated }
}
