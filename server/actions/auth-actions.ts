'use server'

import { hash, compare } from 'bcryptjs'
import { signIn, signOut } from 'next-auth/react'
import { prisma } from '@/lib/db'
import { registerSchema, loginSchema } from '@/schemas/auth'
import type { ActionResponse } from '@/types'

// ============================================================================
// Cadastro
// ============================================================================

export async function registerUser(
  formData: unknown
): Promise<ActionResponse> {
  try {
    const parsed = registerSchema.safeParse(formData)

    if (!parsed.success) {
      return {
        success: false,
        message: 'Validação falhou',
        error: parsed.error.issues[0].message,
      }
    }

    const { name, email, password } = parsed.data

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return {
        success: false,
        message: 'Email já cadastrado',
        error: 'Email já cadastrado',
      }
    }

    // Hash da senha
    const hashedPassword = await hash(password, 12)

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    })

    return {
      success: true,
      message: 'Cadastro realizado com sucesso! Faça login para continuar.',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }
  } catch (error) {
    console.error('Register error:', error)
    return {
      success: false,
      message: 'Erro ao cadastrar',
      error: 'Erro ao cadastrar. Tente novamente.',
    }
  }
}

// ============================================================================
// Login
// ============================================================================

export async function loginUser(formData: unknown): Promise<ActionResponse> {
  try {
    const parsed = loginSchema.safeParse(formData)

    if (!parsed.success) {
      return {
        success: false,
        message: 'Validação falhou',
        error: parsed.error.issues[0].message,
      }
    }

    const { email, password } = parsed.data

    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return {
        success: false,
        message: 'Credenciais inválidas',
        error: 'Email ou senha incorretos',
      }
    }

    if (user.status === 'SUSPENDED') {
      return {
        success: false,
        message: 'Conta suspensa',
        error: 'Usuário suspenso',
      }
    }

    // Validar senha
    const isPasswordValid = await compare(password, user.password)

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Credenciais inválidas',
        error: 'Email ou senha incorretos',
      }
    }

    return {
      success: true,
      message: 'Login realizado com sucesso!',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      message: 'Erro ao fazer login',
      error: 'Erro ao fazer login. Tente novamente.',
    }
  }
}

// ============================================================================
// Logout
// ============================================================================

export async function logoutUser(): Promise<void> {
  await signOut({ redirect: false })
}

// ============================================================================
// Recuperar Senha (Preparado para futuro)
// ============================================================================

export async function requestPasswordReset(email: string): Promise<ActionResponse> {
  try {
    if (!email) {
      return {
        success: false,
        message: 'Email é obrigatório',
        error: 'Email é obrigatório',
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Não revelar se email existe (segurança)
      return {
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link de recuperação',
      }
    }

    // TODO: Implementar envio de email com link de recuperação
    // Por enquanto, apenas retornar sucesso

    return {
      success: true,
      message: 'Se o email estiver cadastrado, você receberá um link de recuperação',
    }
  } catch (error) {
    console.error('Password reset error:', error)
    return {
      success: false,
      message: 'Erro ao solicitar recuperação',
      error: 'Erro ao solicitar recuperação. Tente novamente.',
    }
  }
}
