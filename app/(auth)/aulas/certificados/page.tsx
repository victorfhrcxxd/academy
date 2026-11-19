import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Icon from '@/components/Icon'

export const metadata = { title: 'Certificados — Valeriote Cursos' }

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const certificados = await prisma.enrollment.findMany({
    where: { userId: session.user.id, certificateUrl: { not: null } },
    select: { id: true, certificateUrl: true, course: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-navy-950 mb-1">Certificados</h1>
      <p className="text-gray-500 mb-8">Seus certificados de participação.</p>

      {certificados.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {certificados.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4"
            >
              <div className="flex items-start gap-3">
                <Icon name="graduation-cap" className="h-8 w-8 text-gold-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase text-gray-400">Certificado de participação</p>
                  <p className="font-semibold text-navy-950">{c.course.title}</p>
                </div>
              </div>
              <a
                href={c.certificateUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start rounded-full bg-gold-500 hover:bg-gold-600 text-navy-950 font-black px-5 py-2.5 text-sm transition"
              >
                Ver e baixar certificado
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <Icon name="graduation-cap" className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-navy-950 mb-2">Nenhum certificado ainda</p>
          <p className="text-gray-500 max-w-md mx-auto">
            Os certificados são liberados aqui após a conclusão do evento, para quem cumpriu a
            carga mínima de participação nas transmissões ao vivo.
          </p>
        </div>
      )}
    </div>
  )
}
