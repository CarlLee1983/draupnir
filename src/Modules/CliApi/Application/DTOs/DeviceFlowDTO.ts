export interface InitiateDeviceFlowResponse {
  success: boolean
  message: string
  data?: {
    deviceCode: string
    userCode: string
    verificationUri: string
    expiresIn: number // seconds
    interval: number // polling interval in seconds
  }
  error?: string
}

export interface AuthorizeDeviceRequest {
  userCode: string
}

export interface AuthorizeDeviceResponse {
  success: boolean
  message: string
  error?: string
}

export interface ExchangeDeviceCodeRequest {
  deviceCode: string
}

export interface ExchangeDeviceCodeResponse {
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
  error?: 'authorization_pending' | 'expired' | 'invalid_device_code' | string
}

export interface ProxyCliRequestBody {
  model: string
  messages: Array<{ role: string; content: string }>
  stream?: boolean
  [key: string]: unknown
}

export interface RevokeCliSessionResponse {
  success: boolean
  message: string
  error?: string
}
