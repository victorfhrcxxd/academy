import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSessionCurrent } from '@/lib/session-guard'
import { prisma } from '@/lib/db'

async function authorize(liveId: string) {
  const session = await getServerSession(authOptions)
  if (!session) return null
  if (!(await isSessionCurrent(session))) return null

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

// Lista as perguntas (abertas por votos, respondidas no final)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params
  const session = await authorize(liveId)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const questions = await prisma.question.findMany({
    where: { liveId },
    include: {
      user: { select: { name: true } },
      votes: { select: { userId: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })

  const mapped = questions.map((q) => ({
    id: q.id,
    text: q.text,
    author: q.user.name,
    answered: q.answered,
    votes: q.votes.length,
    myVote: q.votes.some((v) => v.userId === session.user.id),
    mine: q.userId === session.user.id,
    createdAt: q.createdAt.toISOString(),
  }))

  // abertas primeiro (mais votadas em cima), respondidas depois
  mapped.sort((a, b) => {
    if (a.answered !== b.answered) return a.answered ? 1 : -1
    return b.votes - a.votes || b.createdAt.localeCompare(a.createdAt)
  })

  return NextResponse.json({ questions: mapped })
}

// Envia uma pergunta
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params
  const session = await authorize(liveId)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return NextResponse.json({ error: 'Pergunta vazia' }, { status: 400 })
  if (text.length > 400) {
    return NextResponse.json({ error: 'Pergunta muito longa (máx. 400 caracteres)' }, { status: 400 })
  }

  const question = await prisma.question.create({
    data: { liveId, userId: session.user.id, text },
  })

  return NextResponse.json({ ok: true, id: question.id })
}

// Vota/desvota em uma pergunta: {questionId}
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params
  const session = await authorize(liveId)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const questionId = typeof body?.questionId === 'string' ? body.questionId : ''
  if (!questionId) return NextResponse.json({ error: 'questionId obrigatório' }, { status: 400 })

  const existing = await prisma.questionVote.findUnique({
    where: { questionId_userId: { questionId, userId: session.user.id } },
  })

  if (existing) {
    await prisma.questionVote.delete({ where: { id: existing.id } })
    return NextResponse.json({ ok: true, voted: false })
  }

  await prisma.questionVote.create({ data: { questionId, userId: session.user.id } })
  return NextResponse.json({ ok: true, voted: true })
}

// Admin: marca/desmarca como respondida: {id, answered}
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  await params
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (typeof body?.id !== 'string' || typeof body?.answered !== 'boolean') {
    return NextResponse.json({ error: 'id e answered obrigatórios' }, { status: 400 })
  }

  await prisma.question.update({
    where: { id: body.id },
    data: { answered: body.answered },
  })

  return NextResponse.json({ ok: true })
}

// Admin apaga qualquer pergunta; aluno apaga a própria (?id=)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params
  const session = await authorize(liveId)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const question = await prisma.question.findUnique({ where: { id } })
  if (!question) return NextResponse.json({ ok: true })

  if (session.user.role !== 'ADMIN' && question.userId !== session.user.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  await prisma.question.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
