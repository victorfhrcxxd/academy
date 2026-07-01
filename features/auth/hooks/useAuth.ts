'use client'

import { useSession } from 'next-auth/react'
import type { SessionUser } from '@/types'

export function useAuth() {
  const { data: session, status, update } = useSession()

  return {
    user: session?.user as SessionUser | null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    status,
    update,
  }
}
