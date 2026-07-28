import { prisma } from '@/lib/db'
import CoursesManager from '@/components/admin/CoursesManager'

export const metadata = { title: 'Cursos — Admin Valeriote' }
export const dynamic = 'force-dynamic'

export default async function AdminCoursesPage() {
  const courses = await prisma.course.findMany({
    include: { _count: { select: { enrollments: true, lives: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const plain = courses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    students: c._count.enrollments,
    lives: c._count.lives,
  }))

  return <CoursesManager courses={plain} />
}
