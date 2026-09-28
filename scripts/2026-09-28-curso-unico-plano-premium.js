// Migração: curso único com dois planos de matrícula (FREE | PREMIUM).
// Aprovada pelo usuário em 28/09/2026 — substitui o modelo de dois cursos
// da IV Jornada (jornada-2026 gratuito + jornada-premium-2026 pago).
//
// Passos (todos aditivos e idempotentes):
//   1. Colunas novas: Enrollment.plan, Course.hasFreePlan, Course.upgradeUrl
//   2. Backfill: matrículas que já existiam (cursos pagos/manuais) = PREMIUM
//   3. jornada-2026 vira O curso único: preço R$ 49,90 (upgrade Premium),
//      inscrição aberta, plano gratuito ligado e link de upgrade da LP
//
// Rodar com: node scripts/2026-09-28-curso-unico-plano-premium.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // 1. Colunas aditivas (defaults seguros: nada muda pro código antigo)
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'FREE'`
  )
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "hasFreePlan" BOOLEAN NOT NULL DEFAULT false`
  )
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "upgradeUrl" TEXT`
  )
  console.log('1/3 colunas criadas (ou já existiam)')

  // 2. Backfill: tudo que existia antes do plano gratuito era acesso completo
  //    (alunos pagantes do congresso de contratos, matrículas manuais do admin).
  //    Só as matrículas de inscrição gratuita da jornada ficam FREE.
  const backfill = await prisma.$executeRawUnsafe(
    `UPDATE "Enrollment" SET "plan" = 'PREMIUM' WHERE "courseId" <> 'jornada-2026' AND "plan" = 'FREE'`
  )
  console.log(`2/3 backfill: ${backfill} matrículas promovidas a PREMIUM`)

  // 3. Curso único da jornada
  await prisma.$executeRawUnsafe(
    `UPDATE "Course" SET
       "priceCents" = 4990,
       "registrationOpen" = true,
       "hasFreePlan" = true,
       "upgradeUrl" = 'https://page.valecursoseconsultoria.com.br/iv-jornada-licitacoes-e-contratos/?premium=1&utm_source=academy&utm_medium=upsell'
     WHERE "id" = 'jornada-2026'`
  )
  console.log('3/3 jornada-2026 configurado como curso único (Premium R$ 49,90)')

  // Estado final para conferência
  const cursos = await prisma.$queryRawUnsafe(
    `SELECT c."id", c."title", c."priceCents", c."registrationOpen", c."hasFreePlan",
            (SELECT COUNT(*) FROM "Enrollment" e WHERE e."courseId" = c."id") AS matriculas,
            (SELECT COUNT(*) FROM "Registration" r WHERE r."courseId" = c."id") AS inscricoes
     FROM "Course" c ORDER BY c."createdAt"`
  )
  console.table(cursos.map((c) => ({ ...c, matriculas: Number(c.matriculas), inscricoes: Number(c.inscricoes) })))

  const planos = await prisma.$queryRawUnsafe(
    `SELECT "courseId", "plan", COUNT(*)::int AS total FROM "Enrollment" GROUP BY 1, 2 ORDER BY 1, 2`
  )
  console.table(planos)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
