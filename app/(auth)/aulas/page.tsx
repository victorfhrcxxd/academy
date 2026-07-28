import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import NextLiveCard from '@/components/NextLiveCard'

export const metadata = { title: 'Cursos adquiridos — Valeriote Cursos' }

export default async function MemberCoursesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role === 'ADMIN') redirect('/admin')

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id, course: { status: 'ACTIVE' } },
    include: {
      course: {
        include: { _count: { select: { lives: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-navy-950 mb-1">
        Olá, {session.user.name?.split(' ')[0]} 👋
      </h1>
      <p className="text-gray-500 mb-8">Estes são os cursos que você adquiriu.</p>

      <NextLiveCard />

      {enrollments.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-lg font-semibold text-navy-950 mb-2">
            Nenhum curso liberado ainda
          </p>
          <p className="text-gray-500">
            Sua inscrição ainda não foi vinculada a um curso. Fale com um
            administrador da Valeriote.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {enrollments.map(({ course }) => (
          <div
            key={course.id}
            className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="h-11 w-11 rounded-xl bg-navy-950 text-gold-500 flex items-center justify-center text-xl shrink-0">
                🎓
              </div>
              <div>
                <h2 className="font-bold text-navy-950 leading-snug">{course.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {course._count.lives} dia{course._count.lives === 1 ? '' : 's'} de
                  transmissão ao vivo
                </p>
              </div>
            </div>

            {course.description && (
              <p className="text-sm text-gray-600 mb-5 whitespace-pre-line flex-1">
                {course.description}
              </p>
            )}

            <Link
              href={`/aulas/curso/${course.id}`}
              className="mt-auto inline-flex justify-center rounded-lg bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-sm font-bold text-navy-950 transition"
            >
              Acessar curso →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
