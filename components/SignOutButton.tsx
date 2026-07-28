'use client'

import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="rounded-lg bg-navy-950 hover:bg-navy-900 text-white px-3 py-1.5 text-sm font-medium transition"
    >
      Sair
    </button>
  )
}
