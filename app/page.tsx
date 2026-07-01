export default function Home() {
  return (
    <div className="min-h-screen bg-valeriote-gray-50">
      {/* Header */}
      <header className="border-b border-valeriote-gray-200 bg-white">
        <nav className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-valeriote-navy-950">
            Valeriote
          </div>
          <div className="flex gap-6 items-center">
            <a
              href="/login"
              className="text-valeriote-navy-950 hover:text-valeriote-navy-700 font-medium"
            >
              Entrar
            </a>
            <a
              href="/cadastro"
              className="bg-valeriote-navy-950 text-white px-6 py-2 rounded-lg font-medium hover:bg-valeriote-navy-900 transition"
            >
              Cadastro
            </a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-valeriote-navy-950 mb-6">
            Cursos Online de Excelência
          </h1>
          <p className="text-xl text-valeriote-gray-600 mb-8 max-w-2xl mx-auto">
            Capacitação profissional para servidores públicos, agentes políticos e profissionais que atuam com gestão pública.
          </p>
          <a
            href="/cursos"
            className="inline-block bg-valeriote-gold-950 text-white px-8 py-3 rounded-lg font-medium hover:bg-valeriote-gold-900 transition"
          >
            Explorar Cursos
          </a>
        </div>
      </section>

      {/* Status Card */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="bg-white rounded-lg border border-valeriote-gray-200 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {/* Status */}
            <div>
              <div className="text-3xl font-bold text-valeriote-navy-950 mb-2">
                ✓
              </div>
              <h3 className="font-semibold text-valeriote-gray-900 mb-2">
                Etapa 1: Fundação
              </h3>
              <p className="text-valeriote-gray-600 text-sm">
                Setup inicial completo e design system implementado
              </p>
            </div>

            {/* Database */}
            <div>
              <div className="text-3xl font-bold text-valeriote-teal-900 mb-2">
                ✓
              </div>
              <h3 className="font-semibold text-valeriote-gray-900 mb-2">
                Banco de Dados
              </h3>
              <p className="text-valeriote-gray-600 text-sm">
                Schema Prisma com 13 modelos configurados
              </p>
            </div>

            {/* Design */}
            <div>
              <div className="text-3xl font-bold text-valeriote-gold-950 mb-2">
                ✓
              </div>
              <h3 className="font-semibold text-valeriote-gray-900 mb-2">
                Design System
              </h3>
              <p className="text-valeriote-gray-600 text-sm">
                Paleta Valeriote: azul-marinho, dourado e verde-petróleo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-3xl font-bold text-valeriote-navy-950 mb-12 text-center">
          Roadmap de Desenvolvimento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: 1, title: 'Fundação', status: '✓ Completo' },
            { step: 2, title: 'Autenticação', status: '→ Próximo' },
            { step: 3, title: 'Cursos', status: '○ Planejado' },
            { step: 4, title: 'Módulos & Aulas', status: '○ Planejado' },
            { step: 5, title: 'Área Membros', status: '○ Planejado' },
            { step: 6, title: 'Compras', status: '○ Planejado' },
            { step: 7, title: 'Admin', status: '○ Planejado' },
            { step: 8, title: 'Deploy', status: '○ Planejado' },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white rounded-lg border border-valeriote-gray-200 p-6"
            >
              <div className="text-sm font-semibold text-valeriote-gold-950 mb-2">
                ETAPA {item.step}
              </div>
              <h3 className="text-lg font-bold text-valeriote-navy-950 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-valeriote-gray-600">{item.status}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mx-auto max-w-7xl px-6 py-16 bg-valeriote-navy-950 rounded-lg text-white">
        <h2 className="text-3xl font-bold mb-8">Stack Tecnológico</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-lg font-bold mb-4">Frontend & Backend</h3>
            <ul className="space-y-2 text-sm">
              <li>→ Next.js 14</li>
              <li>→ TypeScript</li>
              <li>→ Tailwind CSS</li>
              <li>→ shadcn/ui</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Backend & Auth</h3>
            <ul className="space-y-2 text-sm">
              <li>→ NextAuth.js</li>
              <li>→ Prisma ORM</li>
              <li>→ PostgreSQL</li>
              <li>→ Zod Validation</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Futuro</h3>
            <ul className="space-y-2 text-sm">
              <li>→ Cloudflare R2</li>
              <li>→ Resend (Email)</li>
              <li>→ Stripe / Mercado Pago</li>
              <li>→ Vercel Deploy</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-valeriote-navy-950 mb-6">
          Pronto para começar?
        </h2>
        <p className="text-xl text-valeriote-gray-600 mb-8 max-w-2xl mx-auto">
          Explore nossos cursos e comece sua jornada de aprendizado com a Valeriote
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/cursos"
            className="bg-valeriote-navy-950 text-white px-8 py-3 rounded-lg font-medium hover:bg-valeriote-navy-900 transition"
          >
            Ver Cursos
          </a>
          <a
            href="/cadastro"
            className="border-2 border-valeriote-navy-950 text-valeriote-navy-950 px-8 py-3 rounded-lg font-medium hover:bg-valeriote-navy-50 transition"
          >
            Criar Conta
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-valeriote-navy-950 text-white py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-valeriote-gray-400">
            © 2024 Valeriote Cursos e Consultoria. Todos os direitos reservados.
          </p>
          <p className="text-xs text-valeriote-gray-500 mt-2">
            Capacitação para o setor público | Cursos Online | Consultoria
          </p>
        </div>
      </footer>
    </div>
  )
}
