/** AppAuthMiddleware 認證後注入到 ctx 的上下文 */
export interface AppAuthContext {
  readonly appKeyId: string
  readonly orgId: string
  readonly gatewayKeyId: string
  readonly scope: string // 'read' | 'write' | 'admin'
  readonly boundModuleIds: readonly string[]
}

/** ProxyModelCall 請求 */
export interface ProxyCallRequest {
  readonly model: string
  readonly messages: readonly { role: string; content: string }[]
  readonly temperature?: number
  readonly max_tokens?: number
  readonly stream?: boolean
  readonly [key: string]: unknown
}

/** ProxyModelCall 回應（透傳 Bifrost 回應） */
export interface ProxyCallResponse {
  success: boolean
  message?: string
  data?: unknown
  error?: string
}

/** QueryUsage 回應 */
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

/** QueryBalance 回應 */
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
