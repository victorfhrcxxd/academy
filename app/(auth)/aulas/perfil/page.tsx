import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import ChangePasswordForm from '@/components/forms/ChangePasswordForm'

export const metadata = { title: 'Minha conta — Valeriote Cursos' }

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-navy-950 mb-1">Minha conta</h1>
      <p className="text-gray-500 mb-8">Seus dados de acesso à plataforma.</p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="font-bold text-navy-950 mb-4">Dados</h2>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase font-bold">Nome</p>
            <p className="text-navy-950 font-medium">{session.user.name}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase font-bold">Email</p>
            <p className="text-navy-950 font-medium">{session.user.email}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Precisa corrigir nome ou email? Fale com a equipe Valeriote.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-bold text-navy-950 mb-4">Trocar senha</h2>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
