import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Toda action de admin passa por aqui — retorna a sessão ou lança erro
export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Acesso negado')
  }
  return session
}
