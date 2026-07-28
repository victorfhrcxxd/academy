import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import LoginForm from '@/components/forms/LoginForm'

export const metadata = {
  title: 'Entrar — Valeriote Cursos',
  description: 'Acesse a plataforma de aulas ao vivo da Valeriote Cursos',
}

function BrandMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-16 w-16 rounded-2xl text-3xl' : 'h-12 w-12 rounded-xl text-2xl'
  return (
    <div
      className={`${box} bg-navy-900 text-gold-500 flex items-center justify-center font-black shadow-lg shadow-navy-900/30`}
    >
      V
    </div>
  )
}

const highlights = [
  {
    icon: '🎥',
    title: 'Aulas ao vivo',
    text: 'Assista às transmissões do seu curso presencial em tempo real, de onde estiver.',
  },
  {
    icon: '🎓',
    title: 'Área de membros',
    text: 'Acesso exclusivo para alunos com inscrição confirmada no curso.',
  },
  {
    icon: '🗓️',
    title: 'Agenda organizada',
    text: 'Veja as próximas aulas do seu curso e entre na transmissão em um clique.',
  },
]

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) {
    redirect(session.user.role === 'ADMIN' ? '/admin' : '/aulas')
  }

  return (
    <div className="min-h-screen flex">
      {/* Coluna esquerda — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#f7fafb]">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <BrandMark size="lg" />
            <h1 className="mt-4 text-2xl font-bold text-navy-950">Valeriote Cursos</h1>
            <p className="text-sm text-gray-500 mt-1">Plataforma de Aulas ao Vivo</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <h2 className="text-lg font-bold text-navy-950">Faça seu login</h2>
            <p className="text-sm text-gray-500 mb-6">
              Insira suas credenciais para acessar as aulas.
            </p>
            <Suspense fallback={<div className="text-center text-sm text-gray-500">Carregando...</div>}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Esqueceu a senha? Fale com um administrador.
          </p>

          <p className="text-center text-xs text-gray-400 mt-10">
            Valeriote Cursos e Consultoria © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Coluna direita — institucional */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white flex-col justify-center px-16">
        {/* círculos decorativos */}
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute top-1/2 -right-16 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -bottom-32 left-10 h-96 w-96 rounded-full border border-white/5" />

        <div className="relative max-w-xl">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-4xl font-black tracking-tight">
              <span className="text-gold-500">V</span>ALERIOTE
            </span>
          </div>
          <p className="text-xs tracking-[0.35em] text-white/60 -mt-7 mb-8 ml-1">
            CURSOS E CONSULTORIA
          </p>

          <p className="text-xl text-white/90 mb-10 leading-relaxed">
            Plataforma de transmissão ao vivo — acompanhe as aulas do seu curso
            presencial em um único lugar.
          </p>

          <div className="space-y-4">
            {highlights.map((h) => (
              <div
                key={h.title}
                className="flex items-start gap-4 rounded-xl bg-white/5 border border-white/10 px-5 py-4"
              >
                <div className="h-10 w-10 shrink-0 rounded-lg bg-navy-800 border border-white/10 flex items-center justify-center text-lg">
                  {h.icon}
                </div>
                <div>
                  <p className="font-semibold text-white">{h.title}</p>
                  <p className="text-sm text-white/70">{h.text}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-white/50 mt-10">
            Acesso exclusivo para alunos Valeriote · Seguro · Dados na nuvem
          </p>
        </div>
      </div>
    </div>
  )
}
