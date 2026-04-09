// src/Modules/CliApi/Application/DTOs/DeviceFlowDTO.ts

/** POST /cli/device-code -- 初始化 device flow */
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

/** POST /cli/authorize -- 使用者在瀏覽器授權 */
export interface AuthorizeDeviceRequest {
  userCode: string
}

export interface AuthorizeDeviceResponse {
  success: boolean
  message: string
  error?: string
}

/** POST /cli/token -- CLI 輪詢換取 token */
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

/** POST /cli/proxy -- 轉發 AI 請求 */
export interface ProxyCliRequestBody {
  model: string
  messages: Array<{ role: string; content: string }>
  stream?: boolean
  [key: string]: unknown
}

/** POST /cli/logout -- 撤銷 CLI session */
export interface RevokeCliSessionResponse {
  success: boolean
  message: string
  error?: string
}
