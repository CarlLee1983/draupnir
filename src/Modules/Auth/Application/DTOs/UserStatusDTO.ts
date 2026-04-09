export interface ChangeUserStatusRequest {
  status: 'active' | 'suspended'
}

export interface ChangeUserStatusResponse {
  success: boolean
  message: string
  data?: {
    id: string
    email: string
    role: string
    status: string
    createdAt: string
    updatedAt: string
  }
  error?: string
}
