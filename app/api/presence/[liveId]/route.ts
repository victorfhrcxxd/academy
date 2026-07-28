import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSessionCurrent } from '@/lib/session-guard'
import { prisma } from '@/lib/db'

// Ping de presença: o player do aluno chama a cada ~45s enquanto assiste.
// Soma o tempo assistido com teto por ping pra evitar inflação.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // Admin não conta presença (é equipe)
  if (session.user.role === 'ADMIN') {
    return NextResponse.json({ ok: true, staff: true })
  }

  if (!(await isSessionCurrent(session))) {
    return NextResponse.json({ error: 'Sessão encerrada' }, { status: 403 })
  }

  const live = await prisma.live.findUnique({
    where: { id: liveId },
    select: { courseId: true },
  })
  if (!live) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: live.courseId } },
  })
  if (!enrollment) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const existing = await prisma.attendance.findUnique({
    where: { userId_liveId: { userId: session.user.id, liveId } },
  })

  const now = new Date()
  if (!existing) {
    await prisma.attendance.create({
      data: { userId: session.user.id, liveId, watchSeconds: 0 },
    })
  } else {
    // credita o tempo desde o último ping, com teto de 120s por ping
    const elapsed = Math.round((now.getTime() - existing.lastSeenAt.getTime()) / 1000)
    const credit = Math.max(0, Math.min(elapsed, 120))
    await prisma.attendance.update({
      where: { id: existing.id },
      data: { watchSeconds: { increment: credit }, lastSeenAt: now },
    })
  }

  // atualiza o pico de espectadores simultâneos (janela de 2 min)
  const activeCount = await prisma.attendance.count({
    where: { liveId, lastSeenAt: { gt: new Date(Date.now() - 2 * 60 * 1000) } },
  })
  await prisma.live.updateMany({
    where: { id: liveId, peakViewers: { lt: activeCount } },
    data: { peakViewers: activeCount },
  })

  return NextResponse.json({ ok: true })
}
