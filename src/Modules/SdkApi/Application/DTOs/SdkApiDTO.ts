export interface AppAuthContext {
  readonly appKeyId: string
  readonly orgId: string
  readonly gatewayKeyId: string
  readonly scope: string // 'read' | 'write' | 'admin'
  readonly boundModuleIds: readonly string[]
}

export interface ProxyCallRequest {
  readonly model: string
  readonly messages: readonly { role: string; content: string }[]
  readonly temperature?: number
  readonly max_tokens?: number
  readonly stream?: boolean
  readonly [key: string]: unknown
}

export interface ProxyCallResponse {
  success: boolean
  message?: string
  data?: unknown
  error?: string
}

export interface UsageResponse {
  success: boolean
  message: string
  data?: {
    totalRequests: number
    totalCost: number
    totalTokens: number
    avgLatency: number
  }
  error?: string
}

export interface BalanceQueryResponse {
  success: boolean
  message: string
  data?: {
    balance: string
    lowBalanceThreshold: string
    status: string
  }
  error?: string
}
