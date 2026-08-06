import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Status da inscrição pra página de obrigado da LP (polling).
// id é um cuid opaco (não enumerável); resposta mínima, sem dados pessoais.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const registration = await prisma.registration.findUnique({
    where: { id },
    select: { status: true, modality: true },
  })
  if (!registration) {
    return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  }
  return NextResponse.json(registration, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
