import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { findOrCreateCustomer, createPayment, AsaasError } from '@/lib/asaas'
import { secureCompare } from '@/lib/secure-compare'

// Inscrição vinda do backend da LP (server-to-server, sem CORS).
// Autenticação: header x-internal-token = INTERNAL_API_TOKEN (mesmo valor no .env da LP).
// Cria a inscrição local + cobrança no Asaas e devolve a URL de pagamento.

const bodySchema = z.object({
  courseId: z.string().min(1),
  modality: z.enum(['PRESENCIAL', 'ONLINE']),
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email(),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().length(11)),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .optional(),
  billingType: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED']).optional(),
  origin: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  if (!secureCompare(req.headers.get('x-internal-token'), process.env.INTERNAL_API_TOKEN)) {
    console.error('POST /api/inscricoes: token inválido —', req.headers.get('x-forwarded-for'))
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

  const course = await prisma.course.findUnique({ where: { id: data.courseId } })
  if (!course || !course.registrationOpen || !course.priceCents) {
    return NextResponse.json(
      { error: 'Inscrições indisponíveis para este evento' },
      { status: 422 }
    )
  }

  // Lead clicou 2x / voltou: reaproveita a cobrança PENDING já criada
  const pending = await prisma.registration.findFirst({
    where: {
      email: data.email,
      courseId: course.id,
      modality: data.modality,
      status: 'PENDING',
      paymentUrl: { not: null },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (pending) {
    return NextResponse.json(
      {
        error: 'Já existe uma inscrição aguardando pagamento',
        registrationId: pending.id,
        paymentUrl: pending.paymentUrl,
      },
      { status: 409 }
    )
  }

  // Inscrição local primeiro (o id vira o externalReference da cobrança);
  // falha no Asaas desfaz o registro — nenhum estado parcial fica no banco.
  const registration = await prisma.registration.create({
    data: {
      courseId: course.id,
      modality: data.modality,
      name: data.name,
      email: data.email,
      cpf: data.cpf,
      phone: data.phone || null,
      origin: (data.origin as any) ?? undefined,
    },
  })

  try {
    const customer = await findOrCreateCustomer({
      name: data.name,
      email: data.email,
      cpf: data.cpf,
      phone: data.phone,
    })
    const payment = await createPayment({
      customerId: customer.id,
      valueCents: course.priceCents,
      description: `Inscrição ${data.modality === 'ONLINE' ? 'online' : 'presencial'} — ${course.title}`,
      // prefixo "academy:" separa nossas cobranças de outros sistemas na mesma conta Asaas
      externalReference: `academy:${registration.id}`,
      billingType: data.billingType,
    })

    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        asaasCustomerId: customer.id,
        asaasPaymentId: payment.id,
        paymentUrl: payment.invoiceUrl,
      },
    })

    return NextResponse.json(
      { registrationId: updated.id, status: updated.status, paymentUrl: updated.paymentUrl },
      { status: 201 }
    )
  } catch (error) {
    await prisma.registration.delete({ where: { id: registration.id } }).catch(() => {})
    if (error instanceof AsaasError) {
      console.error('POST /api/inscricoes: Asaas falhou —', error.message)
      return NextResponse.json(
        { error: 'Falha ao criar a cobrança. Tente novamente.' },
        { status: 502 }
      )
    }
    console.error('POST /api/inscricoes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
