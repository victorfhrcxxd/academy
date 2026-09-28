import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { secureCompare } from '@/lib/secure-compare'
import { confirmRegistration } from '@/lib/provisioning'

// Inscrição GRATUITA vinda do backend da LP (server-to-server, sem CORS).
// Autenticação: header x-internal-token = INTERNAL_API_TOKEN (mesmo valor no .env da LP).
// Sem Asaas: cria a inscrição já confirmada e provisiona na hora
// (usuário + matrícula + e-mail de credenciais), reaproveitando o mesmo
// caminho idempotente do webhook de pagamento.

const bodySchema = z.object({
  courseId: z.string().min(1),
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .optional(),
  origin: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  if (!secureCompare(req.headers.get('x-internal-token'), process.env.INTERNAL_API_TOKEN)) {
    console.error('POST /api/inscricoes-gratuitas: token inválido —', req.headers.get('x-forwarded-for'))
    return new NextResponse(null, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 422 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }
  const data = parsed.data

  // Curso precisa existir e estar ativo; o gratuito NÃO exige priceCents nem
  // registrationOpen (essas travas são do fluxo pago).
  const course = await prisma.course.findUnique({ where: { id: data.courseId } })
  if (!course || course.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Curso indisponível' }, { status: 422 })
  }

  // Reenvio do formulário: reaproveita a inscrição gratuita já confirmada
  // (o provisionamento é idempotente e o e-mail tem trava própria).
  const existing = await prisma.registration.findFirst({
    where: { email: data.email, courseId: course.id, modality: 'ONLINE', asaasPaymentId: null },
    orderBy: { createdAt: 'desc' },
  })

  const registration =
    existing ??
    (await prisma.registration.create({
      data: {
        courseId: course.id,
        modality: 'ONLINE',
        name: data.name,
        email: data.email,
        cpf: '', // gratuito não coleta CPF
        phone: data.phone || null,
        status: 'PENDING', // confirmRegistration promove para CONFIRMED
        origin: (data.origin ?? undefined) as never,
      },
    }))

  try {
    await confirmRegistration(registration.id)
  } catch (error) {
    // Registro criado; o cron de varredura completa o provisionamento depois.
    console.error(`inscricoes-gratuitas ${registration.id}: provisionamento falhou —`, error)
  }

  return NextResponse.json(
    { registrationId: registration.id },
    { status: existing ? 409 : 201 }
  )
}
