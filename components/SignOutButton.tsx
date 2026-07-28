'use client'

import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-medium transition"
    >
      Sair
    </button>
  )
}
