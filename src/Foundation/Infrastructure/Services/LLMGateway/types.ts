/**
 * Gateway-neutral DTO types for ILLMGatewayClient.
 * All fields are readonly and camelCase. Snake_case conversion happens
 * exclusively inside BifrostGatewayAdapter.
 */

/**
 * Configuration for virtual key spend limits.
 */
export interface BudgetUpdate {
  /** Maximum cost limit for the budget window. */
  readonly maxLimit: number
  /** Duration for which the budget applies (e.g., '1mo', '7d'). */
  readonly resetDuration: string
  /** Whether the reset window should align with the calendar month/week. */
  readonly calendarAligned?: boolean
}

/**
 * Parameters for creating a new virtual key.
 */
export interface CreateKeyRequest {
  /** Human-readable name for the key. */
  readonly name: string
  /** Optional gateway-side customer identifier. */
  readonly customerId?: string
  /** Bifrost Team ID to attach this key to, enabling per-team spend aggregation. */
  readonly teamId?: string
  /** Whether the key should be enabled immediately. */
  readonly isActive?: boolean
  /** Provider API key IDs to associate. Use `["*"]` to allow all available provider keys. */
  readonly keyIds?: readonly string[]
  /** Virtual-key spend cap for one reset window. */
  readonly budget?: BudgetUpdate
  /** Request and token rate limits. */
  readonly rateLimit?: RateLimitUpdate
  /** Provider-specific allowed models and configurations. */
  readonly providerConfigs?: readonly ProviderConfigUpdate[]
}

/**
 * Parameters for updating an existing virtual key.
 */
export interface UpdateKeyRequest {
  /** Toggle the key's active status. */
  readonly isActive?: boolean
  /** Update spend limits. */
  readonly budget?: BudgetUpdate
  /** Update rate limits. */
  readonly rateLimit?: RateLimitUpdate
  /** Update allowed models. */
  readonly providerConfigs?: readonly ProviderConfigUpdate[]
}

/**
 * Rate limit configuration for tokens and requests.
 */
export interface RateLimitUpdate {
  /** Maximum tokens allowed per reset duration. */
  readonly tokenMaxLimit?: number
  /** Reset window for tokens (e.g., '1m'). */
  readonly tokenResetDuration?: string
  /** Maximum requests allowed per reset duration. */
  readonly requestMaxLimit?: number
  /** Reset window for requests (e.g., '1m'). */
  readonly requestResetDuration?: string
}

/**
 * Provider-specific configuration.
 */
export interface ProviderConfigUpdate {
  /** Provider name (e.g., 'openai', 'anthropic'). */
  readonly provider: string
  /** List of model IDs allowed for this provider (e.g., ['gpt-4']). */
  readonly allowedModels?: readonly string[]
}

/**
 * Response metadata for a virtual key.
 */
export interface KeyResponse {
  /** The unique identifier assigned by the gateway. */
  readonly id: string
  /** The key's display name. */
  readonly name: string
  /** The raw API key value (only available on creation). */
  readonly value?: string
  /** Current active status. */
  readonly isActive: boolean
}

/**
 * Query parameters for usage statistics and logs.
 */
export interface UsageQuery {
  /** ISO 8601 timestamp for the start of the query window. */
  readonly startTime?: string
  /** ISO 8601 timestamp for the end of the query window. */
  readonly endTime?: string
  /** Comma-separated provider filter (e.g., 'openai,anthropic'). */
  readonly providers?: string
  /** Comma-separated model filter (e.g., 'gpt-4,claude-3'). */
  readonly models?: string
  /** Maximum number of records to return. */
  readonly limit?: number
  /** Pagination offset. */
  readonly offset?: number
}

/**
 * Aggregated usage metrics for a set of keys.
 */
export interface UsageStats {
  /** Total number of requests processed. */
  readonly totalRequests: number
  /** Total cost incurred across all requests. */
  readonly totalCost: number
  /** Total tokens consumed. */
  readonly totalTokens: number
  /** Average request latency in milliseconds. */
  readonly avgLatency: number
}

/**
 * Parameters for creating a new team.
 *
 * Draupnir convention: `name` and `customerId` are both set to the organization ID
 * when a Team is provisioned alongside a new organization.
 */
export interface CreateTeamRequest {
  /** Team name (usually set to Org ID). */
  readonly name: string
  /** Optional gateway-side customer identifier. */
  readonly customerId?: string
  /** Team-level budget configuration. */
  readonly budget?: BudgetUpdate
}

/**
 * Response metadata for a team.
 */
export interface TeamResponse {
  /** The unique identifier assigned by the gateway. */
  readonly id: string
  /** The team's name. */
  readonly name: string
  /** The associated gateway-side customer identifier. */
  readonly customerId?: string
  /** The ID of the team's budget configuration. */
  readonly budgetId?: string
}

/**
 * Individual usage log entry.
 */
export interface LogEntry {
  /** ISO 8601 timestamp of the request. */
  readonly timestamp: string
  /** The virtual key ID used for the request. */
  readonly keyId: string
  /** Unique log record identifier from the gateway. */
  readonly logId?: string
  /** Model ID used (e.g., 'gpt-4o'). */
  readonly model: string
  /** Provider name (e.g., 'openai'). */
  readonly provider: string
  /** Number of input tokens. */
  readonly inputTokens: number
  /** Number of output tokens. */
  readonly outputTokens: number
  /** Total tokens consumed. */
  readonly totalTokens: number
  /** Latency in milliseconds. */
  readonly latencyMs: number
  /** Cost of the individual request. */
  readonly cost: number
  /** Final status of the request. */
  readonly status: 'success' | 'error'
}
