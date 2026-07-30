import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Icon from '@/components/Icon'

export const metadata = { title: 'Certificados — Valeriote Cursos' }

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-navy-950 mb-1">Certificados</h1>
      <p className="text-gray-500 mb-8">Seus certificados de participação.</p>

      <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
        <Icon name="graduation-cap" className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-lg font-semibold text-navy-950 mb-2">Nenhum certificado ainda</p>
        <p className="text-gray-500 max-w-md mx-auto">
          Os certificados são liberados aqui após a conclusão do evento. Participe das
          transmissões ao vivo!
        </p>
      </div>
    </div>
  )
}
