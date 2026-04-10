/**
 * Gateway-neutral DTO types for ILLMGatewayClient.
 * All fields are readonly and camelCase. Snake_case conversion happens
 * exclusively inside BifrostGatewayAdapter.
 */

export interface CreateKeyRequest {
  readonly name: string
  readonly customerId?: string
  readonly isActive?: boolean
  readonly rateLimit?: RateLimitUpdate
  readonly providerConfigs?: readonly ProviderConfigUpdate[]
}

export interface UpdateKeyRequest {
  readonly isActive?: boolean
  readonly rateLimit?: RateLimitUpdate
  readonly providerConfigs?: readonly ProviderConfigUpdate[]
}

export interface RateLimitUpdate {
  readonly tokenMaxLimit?: number
  readonly tokenResetDuration?: string
  readonly requestMaxLimit?: number
  readonly requestResetDuration?: string
}

export interface ProviderConfigUpdate {
  readonly provider: string
  readonly allowedModels?: readonly string[]
}

export interface KeyResponse {
  readonly id: string
  readonly name: string
  readonly value?: string
  readonly isActive: boolean
}

export interface UsageQuery {
  readonly startTime?: string
  readonly endTime?: string
  readonly providers?: string // comma-separated provider filter (forwarded to gateway)
  readonly models?: string // comma-separated model filter (forwarded to gateway)
  readonly limit?: number // max log entries to return
}

export interface UsageStats {
  readonly totalRequests: number
  readonly totalCost: number
  readonly totalTokens: number
  readonly avgLatency: number
}

export interface LogEntry {
  readonly timestamp: string
  readonly keyId: string
  readonly model: string
  readonly provider: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
  readonly latencyMs: number
  readonly cost: number
  readonly status: 'success' | 'error'
}
