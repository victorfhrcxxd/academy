'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

// Programação do dia recolhida por padrão, com botão pra expandir
export default function DayProgram({
  count,
  children,
}: {
  count: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-navy-700 hover:bg-gray-50 transition"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        {open
          ? 'Esconder programação'
          : `Ver programação do dia (${count} palestra${count === 1 ? '' : 's'})`}
      </button>

      {open && <div className="px-6 pb-5 bg-gray-50/60 pt-4">{children}</div>}
    </div>
  )
}
