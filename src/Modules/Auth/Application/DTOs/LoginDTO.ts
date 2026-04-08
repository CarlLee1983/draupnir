/**
 * LoginDTO
 * 登入的請求和回應 DTO
 */

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
  data?: {
    accessToken: string
    refreshToken: string
    user: {
      id: string
      email: string
      role: string
    }
  }
  error?: string
}
