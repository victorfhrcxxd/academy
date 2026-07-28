import Link from 'next/link'
import { validateResetToken } from '@/server/actions/password-reset-actions'
import ResetPasswordForm from '@/components/forms/ResetPasswordForm'

export const metadata = { title: 'Nova senha — Valeriote Cursos' }

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const valid = await validateResetToken(token)

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
          <h1 className="mt-4 text-xl font-bold text-navy-950">Criar nova senha</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {valid.success ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="text-center">
              <p className="text-3xl mb-3">⏰</p>
              <p className="font-semibold text-navy-950 mb-2">
                {valid.error || 'Link inválido'}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Peça um novo link de redefinição para continuar.
              </p>
              <Link
                href="/esqueci-senha"
                className="inline-block rounded-lg bg-gold-500 hover:bg-gold-600 px-5 py-2.5 text-sm font-bold text-navy-950 transition"
              >
                Pedir novo link
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="font-medium text-navy-900 hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
