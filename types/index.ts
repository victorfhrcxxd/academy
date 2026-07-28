export interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MEMBER'
  status: 'ACTIVE' | 'INACTIVE'
}
