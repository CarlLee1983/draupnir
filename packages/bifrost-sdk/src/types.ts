/** Budget configuration for limiting the spending of a Virtual Key. */
export interface BifrostBudget {
  /** Unique budget identifier. */
  readonly id?: string
  /** Maximum spending limit (USD). */
  readonly max_limit: number
  /** Reset duration (e.g., `"30d"`, `"720h"`). */
  readonly reset_duration: string
  /** Whether to align with the calendar month (reset at the start of the month). */
  readonly calendar_aligned?: boolean
  /** Last reset time (ISO 8601). */
  readonly last_reset?: string
  /** Current spending in the active period. */
  readonly current_usage?: number
  /** Creation time (ISO 8601). */
  readonly created_at?: string
  /** Update time (ISO 8601). */
  readonly updated_at?: string
}

/** Rate limit configuration for tokens and request counts. */
export interface BifrostRateLimit {
  /** Unique rate limit identifier. */
  readonly id?: string
  /** Maximum token limit. */
  readonly token_max_limit: number
  /** Token reset duration (e.g., `"1h"`, `"24h"`). */
  readonly token_reset_duration: string
  /** Tokens used in the current period. */
  readonly token_current_usage?: number
  /** Last token reset time (ISO 8601). */
  readonly token_last_reset?: string
  /** Maximum request limit; `null` means no limit. */
  readonly request_max_limit?: number | null
  /** Request reset duration; `null` means no limit. */
  readonly request_reset_duration?: string | null
  /** Requests sent in the current period. */
  readonly request_current_usage?: number
  /** Last request reset time (ISO 8601). */
  readonly request_last_reset?: string
  /** Creation time (ISO 8601). */
  readonly created_at?: string
  /** Update time (ISO 8601). */
  readonly updated_at?: string
}

/** Provider routing configuration defining how a Virtual Key distributes requests to backend AI providers. */
export interface BifrostProviderConfig {
  /** Unique provider configuration identifier. */
  readonly id?: number
  /** ID of the associated Virtual Key. */
  readonly virtual_key_id?: string
  /** AI provider name (e.g., `"openai"`, `"anthropic"`). */
  readonly provider: string
  /** Weight for weighted routing; `null` means equal distribution. */
  readonly weight?: number | null
  /** List of models allowed for this provider. */
  readonly allowed_models?: readonly string[]
  /** Associated budget ID. */
  readonly budget_id?: string
  /** Associated rate limit ID. */
  readonly rate_limit_id?: string
  /** Embedded budget configuration (populated on read). */
  readonly budget?: BifrostBudget
  /** Embedded rate limit configuration (populated on read). */
  readonly rate_limit?: BifrostRateLimit
}

/** MCP (Model Context Protocol) integration configuration. */
export interface BifrostMcpConfig {
  /** Unique MCP configuration identifier. */
  readonly id?: number
  /** MCP client name. */
  readonly mcp_client_name: string
  /** List of tool names allowed for execution. */
  readonly tools_to_execute?: readonly string[]
}

/** Full Virtual Key information, including Provider and MCP configurations. */
export interface BifrostVirtualKey {
  /** Unique Virtual Key identifier. */
  readonly id: string
  /** Display name for the Virtual Key. */
  readonly name: string
  /** The value of the Virtual Key (returned only upon creation). */
  readonly value?: string
  /** Description. */
  readonly description?: string
  /** Whether the key is active. */
  readonly is_active: boolean
  /** List of associated provider routing configurations. */
  readonly provider_configs: readonly BifrostProviderConfig[]
  /** List of associated MCP integration configurations. */
  readonly mcp_configs?: readonly BifrostMcpConfig[]
}

/** Parameters for creating a Virtual Key. */
export interface CreateVirtualKeyRequest {
  /** Display name for the Virtual Key. */
  readonly name: string
  /** Description. */
  readonly description?: string
  /** Provider routing configurations (server-side fields excluded). */
  readonly provider_configs?: readonly Omit<BifrostProviderConfig, 'id' | 'virtual_key_id'>[]
  /** MCP integration configurations (server-side fields excluded). */
  readonly mcp_configs?: readonly Omit<BifrostMcpConfig, 'id'>[]
  /** Team ID. */
  readonly team_id?: string
  /** Customer ID. */
  readonly customer_id?: string
  /** Budget configuration. */
  readonly budget?: Pick<BifrostBudget, 'max_limit' | 'reset_duration' | 'calendar_aligned'>
  /** Rate limit configuration. */
  readonly rate_limit?: Pick<
    BifrostRateLimit,
    'token_max_limit' | 'token_reset_duration' | 'request_max_limit' | 'request_reset_duration'
  >
  /** Whether the key is active; defaults to `true`. */
  readonly is_active?: boolean
}

/** Parameters for updating a Virtual Key; all fields are optional. */
export interface UpdateVirtualKeyRequest {
  /** Display name for the Virtual Key. */
  readonly name?: string
  /** Description. */
  readonly description?: string
  /** Provider routing configurations (full replacement). */
  readonly provider_configs?: readonly Omit<BifrostProviderConfig, 'id' | 'virtual_key_id'>[]
  /** MCP integration configurations (full replacement). */
  readonly mcp_configs?: readonly Omit<BifrostMcpConfig, 'id'>[]
  /** Team ID. */
  readonly team_id?: string
  /** Customer ID. */
  readonly customer_id?: string
  /** Budget configuration. */
  readonly budget?: Pick<BifrostBudget, 'max_limit' | 'reset_duration' | 'calendar_aligned'>
  /** Rate limit configuration. */
  readonly rate_limit?: Pick<
    BifrostRateLimit,
    'token_max_limit' | 'token_reset_duration' | 'request_max_limit' | 'request_reset_duration'
  >
  /** Whether the key is active. */
  readonly is_active?: boolean
}

/** API response for a single Virtual Key operation. */
export interface VirtualKeyResponse {
  /** Operation result message. */
  readonly message: string
  /** Virtual Key data. */
  readonly virtual_key: BifrostVirtualKey
}

/** API response for a list of Virtual Keys. */
export interface VirtualKeyListResponse {
  /** A list of Virtual Keys. */
  readonly virtual_keys: readonly BifrostVirtualKey[]
}

/** A single Gateway request log entry. */
export interface BifrostLogEntry {
  /** Unique log identifier. */
  readonly id: string
  /** Parent request ID (used for tracking fallback chains). */
  readonly parent_request_id?: string
  /** The AI provider that handled the request. */
  readonly provider: string
  /** Model name used. */
  readonly model: string
  /** Request status. */
  readonly status: 'processing' | 'success' | 'error'
  /** API object type (e.g., `"chat.completion"`). */
  readonly object: string
  /** Request timestamp (ISO 8601). */
  readonly timestamp: string
  /** Number of retries. */
  readonly number_of_retries?: number
  /** Fallback index (0 indicates the primary provider). */
  readonly fallback_index?: number
  /** Response latency (ms). */
  readonly latency: number
  /** Request cost (USD). */
  readonly cost: number
  /** Provider key ID actually used. */
  readonly selected_key_id?: string
  /** Provider key name actually used. */
  readonly selected_key_name?: string
  /** Virtual Key ID associated with the request. */
  readonly virtual_key_id?: string
  /** Virtual Key name associated with the request. */
  readonly virtual_key_name?: string | null
  /** Input token count. */
  readonly input_tokens?: number
  /** Output token count. */
  readonly output_tokens?: number
  /** Total token count. */
  readonly total_tokens?: number
}

/** Log query parameters; all fields are optional filters. */
export interface BifrostLogsQuery {
  /** Filter by providers (comma-separated). */
  readonly providers?: string
  /** Filter by models (comma-separated). */
  readonly models?: string
  /** Filter by status (comma-separated). */
  readonly status?: string
  /** Filter by Virtual Key IDs (comma-separated). */
  readonly virtual_key_ids?: string
  /** Start time (ISO 8601). */
  readonly start_time?: string
  /** End time (ISO 8601). */
  readonly end_time?: string
  /** Minimum cost filter (USD). */
  readonly min_cost?: number
  /** Maximum cost filter (USD). */
  readonly max_cost?: number
  /** Maximum number of entries to return. */
  readonly limit?: number
  /** Pagination offset. */
  readonly offset?: number
  /** Sorting field (e.g., `"timestamp"`, `"cost"`). */
  readonly sort_by?: string
  /** Sorting order (`"asc"` or `"desc"`). */
  readonly order?: string
}

/** Paginated response for log queries. */
export interface BifrostLogsResponse {
  /** List of log entries. */
  readonly logs: readonly BifrostLogEntry[]
  /** Total count of matching entries (for pagination). */
  readonly total?: number
}

/** Summary of log statistics. */
export interface BifrostLogsStats {
  /** Total requests. */
  readonly total_requests: number
  /** Total cost (USD). */
  readonly total_cost: number
  /** Total token count. */
  readonly total_tokens: number
  /** Average latency (ms). */
  readonly avg_latency: number
}

/** Information about models available on the Gateway. */
export interface BifrostModel {
  /** Model ID (e.g., `"gpt-4o"`, `"claude-sonnet-4-20250514"`). */
  readonly id: string
  /** Canonical model slug. */
  readonly canonical_slug?: string
  /** Model display name. */
  readonly name?: string
  /** Deployment name. */
  readonly deployment?: string
  /** Creation time (Unix timestamp). */
  readonly created?: number
  /** Context window length (token count). */
  readonly context_length?: number
  /** Maximum input tokens. */
  readonly max_input_tokens?: number
  /** Maximum output tokens. */
  readonly max_output_tokens?: number
}

/** Parameters for listing models. */
export interface BifrostModelsQuery {
  /** Filter by provider. */
  readonly provider?: string
  /** Page size. */
  readonly page_size?: number
  /** Pagination cursor. */
  readonly page_token?: string
}

/** API response for model listings. */
export interface BifrostModelsResponse {
  /** List of models. */
  readonly data: readonly BifrostModel[]
}
