import { prisma } from '@/lib/db'
import LivesManager from '@/components/admin/LivesManager'

export const metadata = { title: 'Transmissões — Admin Valeriote' }
export const dynamic = 'force-dynamic'

export default async function AdminLivesPage() {
  const [lives, courses] = await Promise.all([
    prisma.live.findMany({
      include: {
        course: { select: { title: true } },
        talks: { orderBy: { startsAt: 'asc' } },
        attendances: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { watchSeconds: 'desc' },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.course.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
  ])

  const plain = lives.map((l) => ({
    id: l.id,
    courseId: l.courseId,
    courseTitle: l.course.title,
    title: l.title,
    description: l.description,
    scheduledAt: l.scheduledAt.toISOString(),
    endsAt: l.endsAt ? l.endsAt.toISOString() : null,
    embedUrl: l.embedUrl,
    replayUrl: l.replayUrl,
    restrictPlayer: l.restrictPlayer,
    status: l.status,
    attendances: l.attendances.map((a) => ({
      name: a.user.name,
      email: a.user.email,
      minutes: Math.round(a.watchSeconds / 60),
      lastSeenAt: a.lastSeenAt.toISOString(),
    })),
    talks: l.talks.map((t) => ({
      id: t.id,
      title: t.title,
      speakerName: t.speakerName,
      speakerPhoto: t.speakerPhoto,
      startsAt: t.startsAt.toISOString(),
      endsAt: t.endsAt ? t.endsAt.toISOString() : null,
      description: t.description,
    })),
  }))

  return <LivesManager days={plain} courses={courses} />
}
