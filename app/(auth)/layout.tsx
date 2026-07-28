import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { SessionProvider } from '@/components/providers/SessionProvider'
import type { ReactNode } from 'react'

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <SessionProvider>{children}</SessionProvider>
}
