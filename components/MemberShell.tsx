'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'
import type { ReactNode } from 'react'

const menuItems = [
  { href: '/aulas', label: 'Cursos adquiridos', icon: '📚' },
  { href: '/aulas/certificados', label: 'Certificados', icon: '🎓' },
  { href: '/aulas/perfil', label: 'Minha conta', icon: '👤' },
]

// Casca da área do aluno com sidebar recolhível (estado salvo no navegador)
export default function MemberShell({
  userName,
  children,
}: {
  userName?: string | null
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem('valeriote-sidebar') === 'fechada')
    setReady(true)
  }, [])

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('valeriote-sidebar', next ? 'fechada' : 'aberta')
  }

  return (
    <div className="flex min-h-screen bg-[#f4f7f9]">
      {/* Sidebar */}
      <aside
        className={`hidden md:flex shrink-0 flex-col bg-navy-950 text-white overflow-hidden transition-all duration-300 ${
          ready && collapsed ? 'w-0' : 'w-64'
        }`}
      >
        <div className="flex h-16 items-center px-5 border-b border-white/10 w-64">
          <Link href="/aulas">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/valeriote-logo.png" alt="Valeriote" className="h-7 w-auto" />
          </Link>
        </div>

        <nav className="space-y-1 px-4 py-6 flex-1 w-64">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-navy-800 whitespace-nowrap"
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-6 py-4 text-xs text-white/40 border-t border-white/10 w-64 whitespace-nowrap">
          Área do aluno · Valeriote
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Botão de esconder/mostrar o menu (desktop) */}
            <button
              onClick={toggle}
              className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:text-navy-950 hover:bg-gray-100 active:scale-95 transition"
              title={collapsed ? 'Mostrar menu' : 'Esconder menu'}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <rect x="3" y="4" width="18" height="16" rx="2.5" />
                <path d="M9.5 4v16" />
                {collapsed ? <path d="m13.5 9.5 3 2.5-3 2.5" /> : <path d="m16.5 9.5-3 2.5 3 2.5" />}
              </svg>
            </button>

            {/* Menu horizontal no mobile */}
            <nav className="flex md:hidden gap-4 text-sm font-medium text-navy-900 overflow-x-auto">
              {menuItems.map((item) => (
                <Link key={item.href} href={item.href} className="whitespace-nowrap">
                  {item.icon} {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="text-sm text-gray-600 hidden sm:inline">{userName}</span>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 overflow-auto px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
