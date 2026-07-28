import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSessionCurrent } from '@/lib/session-guard'
import { prisma } from '@/lib/db'

// Garante que o usuário logado pode participar do chat desta palestra
async function authorize(liveId: string) {
  const session = await getServerSession(authOptions)
  if (!session) return null
  if (!(await isSessionCurrent(session))) return null

  const live = await prisma.live.findUnique({
    where: { id: liveId },
    select: {
      courseId: true,
      chatLocked: true,
      chatSlowMode: true,
      pinnedMessageId: true,
    },
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

  return { session, live }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params
  const auth = await authorize(liveId)
  if (!auth) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const after = req.nextUrl.searchParams.get('after')

  const [messages, pinnedMessage] = await Promise.all([
    prisma.chatMessage.findMany({
      where: {
        liveId,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    }),
    auth.live.pinnedMessageId
      ? prisma.chatMessage.findUnique({
          where: { id: auth.live.pinnedMessageId },
          include: { user: { select: { name: true, role: true } } },
        })
      : Promise.resolve(null),
  ])

  return NextResponse.json({
    settings: { locked: auth.live.chatLocked, slowMode: auth.live.chatSlowMode },
    pinned: pinnedMessage
      ? {
          id: pinnedMessage.id,
          text: pinnedMessage.text,
          author: pinnedMessage.displayName || pinnedMessage.user.name,
        }
      : null,
    messages: messages.map((m) => ({
      id: m.id,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
      author: m.displayName || m.user.name,
      isAdmin: m.user.role === 'ADMIN',
      mine: m.userId === auth.session.user.id,
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params
  const auth = await authorize(liveId)
  if (!auth) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  const { session, live } = auth
  const isAdmin = session.user.role === 'ADMIN'

  if (live.chatLocked && !isAdmin) {
    return NextResponse.json({ error: 'O chat está bloqueado pela equipe' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''

  // Nome de exibição customizado: só admins podem usar
  const displayName =
    isAdmin && typeof body?.displayName === 'string'
      ? body.displayName.trim().slice(0, 60)
      : ''

  if (!text) {
    return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
  }
  if (text.length > 500) {
    return NextResponse.json({ error: 'Mensagem muito longa (máx. 500 caracteres)' }, { status: 400 })
  }

  // Modo lento: 1 mensagem a cada N segundos por aluno (admins isentos)
  if (live.chatSlowMode > 0 && !isAdmin) {
    const lastMessage = await prisma.chatMessage.findFirst({
      where: { liveId, userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    if (lastMessage) {
      const elapsed = (Date.now() - lastMessage.createdAt.getTime()) / 1000
      const remaining = Math.ceil(live.chatSlowMode - elapsed)
      if (remaining > 0) {
        return NextResponse.json(
          { error: `Modo lento ativo — aguarde ${remaining}s para enviar de novo` },
          { status: 429 }
        )
      }
    }
  }

  const message = await prisma.chatMessage.create({
    data: { liveId, userId: session.user.id, text, displayName: displayName || null },
  })

  return NextResponse.json({ ok: true, id: message.id, createdAt: message.createdAt.toISOString() })
}

// Moderação: admin ajusta bloqueio e modo lento do chat
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const data: { chatLocked?: boolean; chatSlowMode?: number; pinnedMessageId?: string | null } =
    {}
  if (typeof body?.locked === 'boolean') data.chatLocked = body.locked
  if (typeof body?.slowMode === 'number' && body.slowMode >= 0 && body.slowMode <= 600) {
    data.chatSlowMode = Math.round(body.slowMode)
  }
  // fixar/desafixar mensagem: {pin: "id"} ou {pin: null}
  if ('pin' in (body || {})) {
    data.pinnedMessageId = typeof body.pin === 'string' ? body.pin : null
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
  }

  const live = await prisma.live.update({ where: { id: liveId }, data })
  return NextResponse.json({
    ok: true,
    settings: { locked: live.chatLocked, slowMode: live.chatSlowMode },
  })
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
