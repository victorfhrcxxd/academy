// Cria os 3 dias reais do Congresso Brasileiro de Contratos Administrativos
// (17-19/11/2026, Búzios/RJ) com a programação oficial da landing page.
// ATENÇÃO: remove os dias de teste existentes do curso antes de criar.
// Uso: node prisma/seed-congresso.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const COURSE_ID = 'congresso-contratos-2026'

// horários em Brasília (UTC-3) → armazenados em UTC
const brt = (day, time) => new Date(`2026-11-${day}T${time}:00-03:00`)

const DAYS = [
  {
    title: 'Dia 1',
    description:
      'Abertura do Congresso. Credenciamento presencial a partir das 07:00 — a transmissão ao vivo começa às 09:00 (horário de Brasília).',
    scheduledAt: brt('17', '09:00'),
    endsAt: brt('17', '16:00'),
    talks: [
      {
        title:
          'Mapeamento de falhas na execução do objeto e da parte financeira do contrato',
        speakerName: 'Jacoby Fernandes',
        speakerPhoto: '/palestrantes/jacoby.webp',
        startsAt: brt('17', '09:00'),
        endsAt: brt('17', '11:00'),
      },
      {
        title: 'Reequilíbrio econômico-financeiro das obras e serviços de engenharia',
        speakerName: 'Fabrício Mareco',
        speakerPhoto: '/palestrantes/mareco.webp',
        startsAt: brt('17', '11:00'),
        endsAt: brt('17', '12:30'),
      },
      {
        title:
          'Responsabilidade solidária e subsidiária do ente público na terceirização',
        speakerName: 'Christianne de Carvalho Stroppa',
        speakerPhoto: '/palestrantes/stroppa.webp',
        startsAt: brt('17', '14:00'),
        endsAt: brt('17', '15:30'),
      },
    ],
  },
  {
    title: 'Dia 2',
    description: null,
    scheduledAt: brt('18', '09:00'),
    endsAt: brt('18', '17:00'),
    talks: [
      {
        title:
          'Os desafios da manutenção do equilíbrio econômico-financeiro nos contratos',
        speakerName: 'Ronny Charles',
        speakerPhoto: '/palestrantes/ronny.webp',
        startsAt: brt('18', '09:00'),
        endsAt: brt('18', '11:00'),
      },
      {
        title: 'Prorrogações, alterações e sanções administrativas na Lei 14.133/21',
        speakerName: 'Michelle Marry',
        speakerPhoto: '/palestrantes/michelle.webp',
        startsAt: brt('18', '11:00'),
        endsAt: brt('18', '12:30'),
      },
      {
        title: 'Teoria e práticas no sistema Contratos.gov.br',
        speakerName: 'Heles Júnior',
        speakerPhoto: '/palestrantes/heles.webp',
        startsAt: brt('18', '14:00'),
        endsAt: brt('18', '17:00'),
      },
    ],
  },
  {
    title: 'Dia 3',
    description: 'Encerramento do Congresso, com quiz e premiação ao final.',
    scheduledAt: brt('19', '09:00'),
    endsAt: brt('19', '12:30'),
    talks: [
      {
        title:
          'Crise contratual: inadimplemento, sanções, rescisão e proteção do gestor público',
        speakerName: 'Matheus Carvalho',
        speakerPhoto: '/palestrantes/matheus.webp',
        startsAt: brt('19', '09:00'),
        endsAt: brt('19', '10:30'),
      },
      {
        title: 'Gestão, fiscalização e controle de legalidade nos Tribunais de Contas',
        speakerName: 'Min. Benjamin Zymler',
        speakerPhoto: '/palestrantes/zymler.webp',
        startsAt: brt('19', '10:30'),
        endsAt: brt('19', '12:00'),
      },
      {
        title: 'Quiz com premiação',
        speakerName: null,
        speakerPhoto: null,
        startsAt: brt('19', '12:00'),
        endsAt: brt('19', '12:30'),
      },
    ],
  },
]

async function main() {
  const removed = await prisma.live.deleteMany({ where: { courseId: COURSE_ID } })
  console.log(`Dias de teste removidos: ${removed.count}`)

  for (const day of DAYS) {
    const live = await prisma.live.create({
      data: {
        courseId: COURSE_ID,
        title: day.title,
        description: day.description,
        scheduledAt: day.scheduledAt,
        endsAt: day.endsAt,
        restrictPlayer: true,
        talks: { create: day.talks },
      },
    })
    console.log(`✓ ${live.title} — ${day.talks.length} palestras`)
  }

  console.log('Programação do Congresso criada!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
