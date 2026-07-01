import LoginForm from '@/components/forms/LoginForm'

export const metadata = {
  title: 'Entrar - Valeriote Cursos Online',
  description: 'Faça login na sua conta Valeriote',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-valeriote-gray-50 flex items-center justify-center px-6">
      <div className="w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-valeriote-navy-950 mb-4">
            Valeriote
          </h1>
          <p className="text-valeriote-gray-600">
            Capacitação para o setor público
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
