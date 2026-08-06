import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPayment, getPixQrCode, getIdentificationField } from '@/lib/asaas'

// Dados do checkout transparente pra página de obrigado da LP: valor,
// vencimento, PIX (QR + copia e cola), boleto (linha digitável) e a página
// do Asaas (cartão). O id é um cuid opaco e a resposta não tem dados
// pessoais — mesmo modelo de exposição do link de fatura do próprio Asaas.

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const reg = await prisma.registration.findUnique({
    where: { id },
    select: { status: true, modality: true, asaasPaymentId: true, paymentUrl: true },
  })
  if (!reg) {
    return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  }

  // Fora do PENDING não há o que pagar: a LP só precisa do status.
  if (reg.status !== 'PENDING' || !reg.asaasPaymentId) {
    return NextResponse.json(
      { status: reg.status, modality: reg.modality },
      { headers: NO_STORE }
    )
  }

  // Cada parte falha de forma independente: sem PIX ainda dá pra pagar no
  // boleto ou na página do Asaas — a LP esconde o que vier nulo.
  const [payment, pix, boleto] = await Promise.all([
    getPayment(reg.asaasPaymentId).catch(() => null),
    getPixQrCode(reg.asaasPaymentId).catch(() => null),
    getIdentificationField(reg.asaasPaymentId).catch(() => null),
  ])

  return NextResponse.json(
    {
      status: reg.status,
      modality: reg.modality,
      value: payment?.value ?? null,
      dueDate: payment?.dueDate ?? null,
      invoiceUrl: payment?.invoiceUrl ?? reg.paymentUrl,
      pix: pix?.payload
        ? {
            encodedImage: pix.encodedImage,
            payload: pix.payload,
            expirationDate: pix.expirationDate ?? null,
          }
        : null,
      boleto: boleto?.identificationField
        ? {
            identificationField: boleto.identificationField,
            bankSlipUrl: payment?.bankSlipUrl ?? null,
          }
        : null,
    },
    { headers: NO_STORE }
  )
}
