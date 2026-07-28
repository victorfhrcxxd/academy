import Link from 'next/link'
import ForgotPasswordForm from '@/components/forms/ForgotPasswordForm'

export const metadata = { title: 'Esqueci a senha — Valeriote Cursos' }

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7fafb] px-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-navy-900 p-2.5 shadow-lg shadow-navy-900/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/valeriote-favicon.webp"
              alt="Valeriote"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="mt-4 text-xl font-bold text-navy-950">Esqueceu a senha?</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Informe seu email e enviaremos um link para criar uma nova senha.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <ForgotPasswordForm />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Lembrou a senha?{' '}
          <Link href="/login" className="font-medium text-navy-900 hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
