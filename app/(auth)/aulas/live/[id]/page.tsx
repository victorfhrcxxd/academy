import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import LiveStatusBadge from '@/components/LiveStatusBadge'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const live = await prisma.live.findUnique({
    where: { id },
    include: { course: true },
  })

  if (!live) notFound()

  // Aluno só entra se estiver matriculado no curso da live (admin sempre pode)
  if (session.user.role !== 'ADMIN') {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: session.user.id, courseId: live.courseId },
      },
    })
    if (!enrollment) redirect('/aulas')
  }

  return (
    <div>
      <Link href="/aulas" className="text-sm text-navy-700 hover:underline">
        ← Voltar para minhas aulas
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-navy-950">{live.title}</h1>
        <LiveStatusBadge status={live.status} />
      </div>

      <p className="text-gray-500 mb-6">
        {live.course.title} · {dateFormatter.format(live.scheduledAt)}
      </p>

      {live.embedUrl ? (
        <div className="rounded-2xl overflow-hidden border border-gray-200 bg-black shadow-sm">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe
              src={live.embedUrl}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              title={live.title}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center">
          <p className="text-4xl mb-4">🎥</p>
          <p className="text-lg font-semibold text-navy-950 mb-2">
            Transmissão ainda não liberada
          </p>
          <p className="text-gray-500 max-w-md mx-auto">
            O link da transmissão será disponibilizado aqui{' '}
            {live.status === 'SCHEDULED' ? 'antes do início da aula' : 'em breve'}.
            Atualize a página perto do horário marcado.
          </p>
        </div>
      )}

      {live.description && (
        <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 mb-2">Sobre esta aula</h2>
          <p className="text-gray-600 whitespace-pre-line">{live.description}</p>
        </div>
      )}
    </div>
  )
}
