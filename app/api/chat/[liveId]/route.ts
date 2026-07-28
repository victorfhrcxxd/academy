import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Garante que o usuário logado pode participar do chat desta palestra
async function authorize(liveId: string) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const live = await prisma.live.findUnique({
    where: { id: liveId },
    select: { courseId: true },
  })
  if (!live) return null

  if (session.user.role !== 'ADMIN') {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: session.user.id, courseId: live.courseId },
      },
    })
    if (!enrollment) return null
  }

  return session
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params
  const session = await authorize(liveId)
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const after = req.nextUrl.searchParams.get('after')

  const messages = await prisma.chatMessage.findMany({
    where: {
      liveId,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
      author: m.user.name,
      isAdmin: m.user.role === 'ADMIN',
      mine: m.userId === session.user.id,
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params
  const session = await authorize(liveId)
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''

  if (!text) {
    return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
  }
  if (text.length > 500) {
    return NextResponse.json({ error: 'Mensagem muito longa (máx. 500 caracteres)' }, { status: 400 })
  }

  const message = await prisma.chatMessage.create({
    data: { liveId, userId: session.user.id, text },
  })

  return NextResponse.json({ ok: true, id: message.id, createdAt: message.createdAt.toISOString() })
}

// Moderação: admin pode apagar mensagem (?id=...)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  await params
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  await prisma.chatMessage.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
