import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import SignOutButton from '@/components/SignOutButton'
import type { ReactNode } from 'react'

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/membros', label: 'Alunos', icon: '👥' },
  { href: '/admin/cursos', label: 'Cursos', icon: '🎓' },
  { href: '/admin/lives', label: 'Transmissões', icon: '🎥' },
  { href: '/admin/avaliacoes', label: 'Avaliações', icon: '⭐' },
  { href: '/admin/emails', label: 'Emails', icon: '✉️' },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/aulas')

  return (
    <div className="flex min-h-screen bg-[#f4f7f9]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-navy-950 text-white">
        <div className="flex h-16 items-center px-5 border-b border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/valeriote-logo.png"
            alt="Valeriote"
            className="h-7 w-auto"
          />
        </div>

        <nav className="space-y-1 px-4 py-6 flex-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-navy-800"
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-6 py-4 text-xs text-white/40 border-t border-white/10">
          Plataforma de Aulas ao Vivo
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          {/* Menu horizontal no mobile */}
          <nav className="flex md:hidden gap-3 text-sm font-medium text-navy-900 overflow-x-auto">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap">
                {item.icon} {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:block" />

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{session.user.name}</p>
              <p className="text-xs text-gray-500">Administrador</p>
            </div>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 overflow-auto px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  )
}
