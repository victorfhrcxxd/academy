import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'ADMIN' | 'MEMBER',
          status: user.status as 'ACTIVE' | 'INACTIVE',
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as 'ADMIN' | 'MEMBER'
        session.user.status = token.status as 'ACTIVE' | 'INACTIVE'
      }
      return session
    },
  },
}
