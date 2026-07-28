import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import DevToolsBlocker from '@/components/DevToolsBlocker'
import SupportButton from '@/components/SupportButton'
import MemberShell from '@/components/MemberShell'
import type { ReactNode } from 'react'

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <>
      {/* Inibidor de DevTools só para alunos — admin fica isento pra depurar */}
      {session?.user?.role !== 'ADMIN' && <DevToolsBlocker />}

      <MemberShell userName={session?.user?.name}>{children}</MemberShell>

      {process.env.WHATSAPP_SUPPORT && (
        <SupportButton phone={process.env.WHATSAPP_SUPPORT} />
      )}
    </>
  )
}
