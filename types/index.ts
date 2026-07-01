export type SessionUser = {
  id: string
  email: string
  name: string
  role: 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  avatarUrl?: string
}

export type ActionResponse<T = any> = {
  success: boolean
  message: string
  data?: T
  error?: string
}
