import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { toEmbedUrl } from '@/lib/embed'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import LiveChat from '@/components/LiveChat'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

const endTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
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

  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className="mx-auto max-w-[1800px]">
      <Link
        href={isAdmin ? '/admin/lives' : '/aulas'}
        className="text-sm text-navy-700 hover:underline"
      >
        ← {isAdmin ? 'Voltar para o painel' : 'Voltar para as palestras'}
      </Link>

      <div className="mt-4 mb-6 flex items-center gap-4">
        {live.speakerPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={live.speakerPhoto}
            alt={live.speakerName || 'Palestrante'}
            className="h-16 w-16 rounded-full object-cover border-2 border-gold-500 shrink-0"
          />
        )}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-navy-950">{live.title}</h1>
            <LiveStatusBadge status={live.status} />
          </div>
          <p className="text-gray-500 mt-1">
            {live.speakerName && (
              <span className="font-medium text-navy-900">{live.speakerName} · </span>
            )}
            {live.course.title} · {dateFormatter.format(live.scheduledAt)}
            {live.endsAt && <> às {endTimeFormatter.format(live.endsAt)}</>}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] items-start">
        {live.embedUrl ? (
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-black shadow-sm self-start">
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                src={toEmbedUrl(live.embedUrl)}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                title={live.title}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center flex flex-col items-center justify-center">
            <p className="text-4xl mb-4">🎥</p>
            <p className="text-lg font-semibold text-navy-950 mb-2">
              Transmissão ainda não liberada
            </p>
            <p className="text-gray-500 max-w-md mx-auto">
              O link da transmissão será disponibilizado aqui{' '}
              {live.status === 'SCHEDULED' ? 'antes do início da palestra' : 'em breve'}.
              Atualize a página perto do horário marcado.
            </p>
          </div>
        )}

        <div className="lg:h-[calc(100vh-230px)] lg:min-h-[540px]">
          <LiveChat liveId={live.id} canModerate={isAdmin} />
        </div>
      </div>

      {live.description && (
        <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 mb-2">Sobre esta palestra</h2>
          <p className="text-gray-600 whitespace-pre-line">{live.description}</p>
        </div>
      )}
    </div>
  )
}
