import { prisma } from '@/lib/db'
import LivesManager from '@/components/admin/LivesManager'

export const metadata = { title: 'Aulas ao vivo — Admin Valeriote' }
export const dynamic = 'force-dynamic'

export default async function AdminLivesPage() {
  const [lives, courses] = await Promise.all([
    prisma.live.findMany({
      include: { course: { select: { title: true } } },
      orderBy: { scheduledAt: 'desc' },
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
    embedUrl: l.embedUrl,
    status: l.status,
  }))

  return <LivesManager lives={plain} courses={courses} />
}
