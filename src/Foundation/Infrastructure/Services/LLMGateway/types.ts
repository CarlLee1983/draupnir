/**
 * Gateway-neutral DTO types for ILLMGatewayClient.
 * All fields are readonly and camelCase. Snake_case conversion happens
 * exclusively inside BifrostGatewayAdapter.
 */

/** Matches Bifrost `CreateVirtualKeyRequest.budget` / `UpdateVirtualKeyRequest.budget` (camelCase). */
export interface BudgetUpdate {
  readonly maxLimit: number
  readonly resetDuration: string
  readonly calendarAligned?: boolean
}

export interface CreateKeyRequest {
  readonly name: string
  readonly customerId?: string
  /** Bifrost Team ID to attach this key to, enabling per-team spend aggregation. */
  readonly teamId?: string
  readonly isActive?: boolean
  /** Provider API key IDs to associate. Use `["*"]` to allow all available provider keys. */
  readonly keyIds?: readonly string[]
  /** Virtual-key spend cap for one reset window (forwarded to Bifrost `budget`). */
  readonly budget?: BudgetUpdate
  readonly rateLimit?: RateLimitUpdate
  readonly providerConfigs?: readonly ProviderConfigUpdate[]
}

export interface UpdateKeyRequest {
  readonly isActive?: boolean
  readonly budget?: BudgetUpdate
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

/**
 * Team creation request (camelCase).
 *
 * Draupnir convention: `name` and `customerId` are both set to the organization ID
 * when a Team is provisioned alongside a new organization. `budget` is omitted
 * because Virtual Keys attached to the Team carry their own budgets.
 */
export interface CreateTeamRequest {
  readonly name: string
  readonly customerId?: string
  readonly budget?: BudgetUpdate
}

export interface TeamResponse {
  readonly id: string
  readonly name: string
  readonly customerId?: string
  readonly budgetId?: string
}

export interface LogEntry {
  readonly timestamp: string
  readonly keyId: string
  readonly logId?: string
  readonly model: string
  readonly provider: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
  readonly latencyMs: number
  readonly cost: number
  readonly status: 'success' | 'error'
}
