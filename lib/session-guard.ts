import type { Session } from 'next-auth'
import { prisma } from './db'

// Sessão única: confere se a sessão do aluno ainda é a mais recente.
// Se ele logou em outro dispositivo, o activeSessionId no banco mudou
// e esta sessão fica inválida. Admins não passam por essa checagem.
export async function isSessionCurrent(session: Session): Promise<boolean> {
  if (session.user.role === 'ADMIN') return true

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeSessionId: true, status: true },
  })
  if (!user || user.status !== 'ACTIVE') return false
  if (!user.activeSessionId) return true // contas antigas sem id ainda

  return user.activeSessionId === session.user.sessionId
}
