import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from './db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user) {
          throw new Error('Email ou senha incorretos')
        }

        if (user.status !== 'ACTIVE') {
          throw new Error('Acesso desativado. Fale com um administrador.')
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Email ou senha incorretos')
        }

        // Sessão única para alunos: cada login gera um id novo e derruba o anterior.
        // Admins podem ter várias sessões (celular + computador).
        let sessionId: string | null = null
        if (user.role === 'MEMBER') {
          sessionId = randomBytes(16).toString('hex')
          await prisma.user.update({
            where: { id: user.id },
            data: { activeSessionId: sessionId },
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'ADMIN' | 'MEMBER',
          status: user.status as 'ACTIVE' | 'INACTIVE',
          sessionId,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.status = user.status
        token.sessionId = user.sessionId ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as 'ADMIN' | 'MEMBER'
        session.user.status = token.status as 'ACTIVE' | 'INACTIVE'
        session.user.sessionId = (token.sessionId as string | null) ?? null
      }
      return session
    },
  },
}
