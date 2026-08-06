import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { payWithCreditCard, AsaasError } from '@/lib/asaas'
import { confirmRegistration } from '@/lib/provisioning'
import { secureCompare } from '@/lib/secure-compare'

// Cartão de crédito do checkout transparente da LP (server-to-server, com
// x-internal-token: o navegador fala com o backend da LP, nunca direto aqui).
// Os dados do cartão só transitam até o Asaas — nada é gravado nem logado.

export const maxDuration = 60

const bodySchema = z.object({
  holderName: z.string().trim().min(2).max(100),
  number: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().min(13).max(19)),
  expiryMonth: z.string().regex(/^(0?[1-9]|1[0-2])$/),
  expiryYear: z.string().regex(/^20\d{2}$/),
  ccv: z.string().regex(/^\d{3,4}$/),
  holderCpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().length(11)),
  postalCode: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().length(8)),
  addressNumber: z.string().trim().min(1).max(10),
  remoteIp: z.string().max(64).optional(),
})

// Cap de tentativas por inscrição (por instância serverless): barra rajadas de
// teste de cartão sem precisar de estado no banco; o antifraude do Asaas cobre
// o resto. Depois do limite, o lead ainda tem PIX e boleto.
const tentativas = new Map<string, number>()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!secureCompare(req.headers.get('x-internal-token'), process.env.INTERNAL_API_TOKEN)) {
    console.error('POST /api/inscricoes/:id/pagar-cartao: token inválido')
    return new NextResponse(null, { status: 401 })
  }

  const { id } = await params
  const reg = await prisma.registration.findUnique({
    where: { id },
    select: {
      status: true,
      modality: true,
      asaasPaymentId: true,
      email: true,
      phone: true,
    },
  })
  if (!reg) {
    return NextResponse.json({ ok: false, error: 'Inscrição não encontrada' }, { status: 404 })
  }
  if (reg.status !== 'PENDING' || !reg.asaasPaymentId) {
    return NextResponse.json(
      { ok: false, error: 'Esta inscrição não está aguardando pagamento' },
      { status: 409 }
    )
  }

  const n = (tentativas.get(id) ?? 0) + 1
  tentativas.set(id, n)
  if (n > 10) {
    return NextResponse.json(
      { ok: false, error: 'Muitas tentativas com cartão. Pague por PIX ou boleto, ou fale com a equipe.' },
      { status: 429 }
    )
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Dados inválidos' }, { status: 422 })
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Confira os dados do cartão e tente de novo.' },
      { status: 422 }
    )
  }
  const data = parsed.data

  try {
    const payment = await payWithCreditCard(reg.asaasPaymentId, {
      creditCard: {
        holderName: data.holderName,
        number: data.number,
        expiryMonth: data.expiryMonth.padStart(2, '0'),
        expiryYear: data.expiryYear,
        ccv: data.ccv,
      },
      holderInfo: {
        name: data.holderName,
        email: reg.email,
        cpfCnpj: data.holderCpf,
        postalCode: data.postalCode,
        addressNumber: data.addressNumber,
        phone: reg.phone ?? undefined,
      },
      remoteIp: data.remoteIp,
    })

    // Aprovou: provisiona já (idempotente — o webhook que vier depois não
    // duplica nada) para o acesso e o e-mail saírem na hora.
    after(() => confirmRegistration(id))

    return NextResponse.json({ ok: true, status: payment.status })
  } catch (error) {
    if (error instanceof AsaasError) {
      // Corpo de recusa do Asaas: {errors:[{code, description}]} — sem dado de cartão
      let msg = 'Pagamento não autorizado. Confira os dados ou tente outro cartão.'
      try {
        const parsedErr = JSON.parse(error.body) as { errors?: { description?: string }[] }
        if (parsedErr.errors?.[0]?.description) msg = parsedErr.errors[0].description
      } catch {
        /* mantém a mensagem padrão */
      }
      console.error(`pagar-cartao ${id}: Asaas ${error.status} — ${msg}`)
      return NextResponse.json({ ok: false, error: msg }, { status: 402 })
    }
    console.error(`pagar-cartao ${id}:`, error)
    return NextResponse.json(
      { ok: false, error: 'Erro ao processar. Tente novamente em instantes.' },
      { status: 500 }
    )
  }
}
