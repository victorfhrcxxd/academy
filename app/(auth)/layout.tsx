import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { isSessionCurrent } from '@/lib/session-guard'
import { SessionProvider } from '@/components/providers/SessionProvider'
import type { ReactNode } from 'react'

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Sessão única: se o aluno logou em outro dispositivo, esta sessão cai
  if (!(await isSessionCurrent(session))) {
    redirect('/login?motivo=outra-sessao')
  }

  return <SessionProvider>{children}</SessionProvider>
}
