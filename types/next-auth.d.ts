import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    role: 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN'
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    avatarUrl?: string
  }

  interface Session {
    user: User & {
      email: string
      name: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN'
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    avatarUrl?: string
  }
}
