import { prisma } from '@/lib/db'
import MembersManager from '@/components/admin/MembersManager'

export const metadata = { title: 'Alunos — Admin Valeriote' }
export const dynamic = 'force-dynamic'

export default async function AdminMembersPage() {
  const [members, courses] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'MEMBER' },
      include: { enrollments: { select: { courseId: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.course.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
  ])

  const plainMembers = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    courseIds: m.enrollments.map((e) => e.courseId),
  }))

  return <MembersManager members={plainMembers} courses={courses} />
}
