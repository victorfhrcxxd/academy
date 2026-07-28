import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSessionCurrent } from '@/lib/session-guard'
import { prisma } from '@/lib/db'

// Próxima transmissão do aluno (ou a que está AO VIVO agora)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ next: null }, { status: 403 })
  if (!(await isSessionCurrent(session))) {
    return NextResponse.json({ next: null }, { status: 403 })
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    select: { courseId: true },
  })
  const courseIds = enrollments.map((e) => e.courseId)
  if (courseIds.length === 0) return NextResponse.json({ next: null })

  // prioridade: algo AO VIVO agora; senão, a próxima agendada
  const liveNow = await prisma.live.findFirst({
    where: { courseId: { in: courseIds }, status: 'LIVE' },
    include: { course: { select: { title: true } } },
  })

  const next =
    liveNow ||
    (await prisma.live.findFirst({
      where: {
        courseId: { in: courseIds },
        status: 'SCHEDULED',
        scheduledAt: { gt: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      include: { course: { select: { title: true } } },
    }))

  if (!next) return NextResponse.json({ next: null })

  return NextResponse.json({
    next: {
      id: next.id,
      title: next.title,
      courseTitle: next.course.title,
      scheduledAt: next.scheduledAt.toISOString(),
      status: next.status,
    },
  })
}
