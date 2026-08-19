import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import MembersManager from '@/components/admin/MembersManager'

export const metadata = { title: 'Usuários — Admin Valeriote' }
export const dynamic = 'force-dynamic'

export default async function AdminMembersPage() {
  const [session, members, courses] = await Promise.all([
    getServerSession(authOptions),
    prisma.user.findMany({
      include: { enrollments: { select: { courseId: true } } },
      // "ADMIN" < "MEMBER" — admins aparecem primeiro
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
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
    role: m.role,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    courseIds: m.enrollments.map((e) => e.courseId),
  }))

  return (
    <MembersManager
      members={plainMembers}
      courses={courses}
      currentUserId={session?.user.id ?? ''}
    />
  )
}
