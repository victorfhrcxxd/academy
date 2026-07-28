import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SignOutButton from '@/components/SignOutButton'
import type { ReactNode } from 'react'

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen bg-[#f4f7f9]">
      <nav className="bg-navy-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/aulas" className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-lg bg-navy-800 text-gold-500 flex items-center justify-center font-black">
              V
            </span>
            <span className="font-bold">Valeriote Cursos</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/70 hidden sm:inline">
              {session?.user?.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  )
}
