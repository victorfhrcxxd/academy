import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    role: 'ADMIN' | 'MEMBER'
    status: 'ACTIVE' | 'INACTIVE'
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
    role: 'ADMIN' | 'MEMBER'
    status: 'ACTIVE' | 'INACTIVE'
  }
}
