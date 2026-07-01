import RegisterForm from '@/components/forms/RegisterForm'

export const metadata = {
  title: 'Cadastro - Valeriote Cursos Online',
  description: 'Crie sua conta Valeriote',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-valeriote-gray-50 flex items-center justify-center px-6">
      <div className="w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-valeriote-navy-950 mb-4">
            Valeriote
          </h1>
          <p className="text-valeriote-gray-600">
            Comece sua jornada de aprendizado
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}
