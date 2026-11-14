import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { secureCompare } from '@/lib/secure-compare'
import { confirmRegistration } from '@/lib/provisioning'

// Importação em massa de COMPRADORES (pagaram fora da plataforma — ex.: venda
// direta da equipe). Server-to-server, header x-internal-token.
// Para cada pessoa: inscrição CONFIRMED com origin.paidImport → provisiona
// usuário + matrícula e envia o e-mail de comprador ("pagamento confirmado,
// crie sua senha"), tudo pelo mesmo caminho idempotente do webhook.
export const maxDuration = 300

const bodySchema = z.object({
  courseId: z.string().min(1),
  people: z
    .array(
      z.object({
        name: z.string().trim().min(3).max(120),
        email: z.string().trim().toLowerCase().email(),
        phone: z
          .string()
          .transform((v) => v.replace(/\D/g, ''))
          .optional(),
        info: z.record(z.string(), z.unknown()).optional(), // cargo/órgão/cidade etc.
      })
    )
    .min(1)
    .max(200),
})

export async function POST(req: NextRequest) {
  if (!secureCompare(req.headers.get('x-internal-token'), process.env.INTERNAL_API_TOKEN)) {
    console.error('POST /api/inscricoes-import: token inválido')
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
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId } })
  if (!course || course.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Curso indisponível' }, { status: 422 })
  }

  const results: { email: string; registrationId: string; resultado: string }[] = []

  for (const person of parsed.data.people) {
    try {
      // reenvio da mesma lista não duplica: reaproveita a inscrição existente
      const existing = await prisma.registration.findFirst({
        where: {
          email: person.email,
          courseId: course.id,
          modality: 'ONLINE',
          asaasPaymentId: null,
        },
        orderBy: { createdAt: 'desc' },
      })

      const registration =
        existing ??
        (await prisma.registration.create({
          data: {
            courseId: course.id,
            modality: 'ONLINE',
            name: person.name,
            email: person.email,
            cpf: '',
            phone: person.phone || null,
            status: 'PENDING', // confirmRegistration promove e provisiona
            origin: { paidImport: true, ...((person.info as object) ?? {}) },
          },
        }))

      await confirmRegistration(registration.id)
      const after = await prisma.registration.findUnique({ where: { id: registration.id } })
      results.push({
        email: person.email,
        registrationId: registration.id,
        resultado:
          (existing ? 'já existia' : 'criada') +
          (after?.welcomeEmailAt ? ' / e-mail enviado' : ' / e-mail PENDENTE (cron reenvia)'),
      })
    } catch (error) {
      console.error(`inscricoes-import ${person.email}:`, error)
      results.push({ email: person.email, registrationId: '', resultado: 'ERRO: ' + String(error).slice(0, 120) })
    }
  }

  return NextResponse.json({ ok: true, curso: course.title, results })
}
