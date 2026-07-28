import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Métricas ao vivo de um dia (só admin): assistindo agora, pico, msgs/min, total
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const now = Date.now()
  const [watchingNow, totalAttendees, msgsLastMin, live] = await Promise.all([
    prisma.attendance.count({
      where: { liveId, lastSeenAt: { gt: new Date(now - 2 * 60 * 1000) } },
    }),
    prisma.attendance.count({ where: { liveId } }),
    prisma.chatMessage.count({
      where: { liveId, createdAt: { gt: new Date(now - 60 * 1000) } },
    }),
    prisma.live.findUnique({ where: { id: liveId }, select: { peakViewers: true } }),
  ])

  return NextResponse.json({
    watchingNow,
    peak: live?.peakViewers ?? 0,
    msgsLastMin,
    totalAttendees,
  })
}
