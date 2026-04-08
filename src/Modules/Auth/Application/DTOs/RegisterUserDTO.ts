/**
 * RegisterUserDTO
 * 註冊用戶的請求和回應 DTO
 */

export interface RegisterUserRequest {
  email: string
  password: string
  confirmPassword?: string
}

export interface RegisterUserResponse {
  success: boolean
  message: string
  data?: {
    id: string
    email: string
    role: string
  }
  error?: string
}
