// src/Foundation/Infrastructure/Services/BifrostClient/types.ts

// === Virtual Key ===

export interface BifrostBudget {
  readonly id?: string
  readonly max_limit: number
  readonly reset_duration: string
  readonly calendar_aligned?: boolean
  readonly last_reset?: string
  readonly current_usage?: number
  readonly created_at?: string
  readonly updated_at?: string
}

export interface BifrostRateLimit {
  readonly id?: string
  readonly token_max_limit: number
  readonly token_reset_duration: string
  readonly token_current_usage?: number
  readonly token_last_reset?: string
  readonly request_max_limit?: number | null
  readonly request_reset_duration?: string | null
  readonly request_current_usage?: number
  readonly request_last_reset?: string
  readonly created_at?: string
  readonly updated_at?: string
}

export interface BifrostProviderConfig {
  readonly id?: number
  readonly virtual_key_id?: string
  readonly provider: string
  readonly weight?: number | null
  readonly allowed_models?: readonly string[]
  readonly budget_id?: string
  readonly rate_limit_id?: string
  readonly budget?: BifrostBudget
  readonly rate_limit?: BifrostRateLimit
}

export interface BifrostMcpConfig {
  readonly id?: number
  readonly mcp_client_name: string
  readonly tools_to_execute?: readonly string[]
}

export interface BifrostVirtualKey {
  readonly id: string
  readonly name: string
  readonly value?: string
  readonly description?: string
  readonly is_active: boolean
  readonly provider_configs: readonly BifrostProviderConfig[]
  readonly mcp_configs?: readonly BifrostMcpConfig[]
}

export interface CreateVirtualKeyRequest {
  readonly name: string
  readonly description?: string
  readonly provider_configs?: readonly Omit<BifrostProviderConfig, 'id' | 'virtual_key_id'>[]
  readonly mcp_configs?: readonly Omit<BifrostMcpConfig, 'id'>[]
  readonly team_id?: string
  readonly customer_id?: string
  readonly budget?: Pick<BifrostBudget, 'max_limit' | 'reset_duration' | 'calendar_aligned'>
  readonly rate_limit?: Pick<BifrostRateLimit, 'token_max_limit' | 'token_reset_duration' | 'request_max_limit' | 'request_reset_duration'>
  readonly is_active?: boolean
}

export interface UpdateVirtualKeyRequest {
  readonly name?: string
  readonly description?: string
  readonly provider_configs?: readonly Omit<BifrostProviderConfig, 'id' | 'virtual_key_id'>[]
  readonly mcp_configs?: readonly Omit<BifrostMcpConfig, 'id'>[]
  readonly team_id?: string
  readonly customer_id?: string
  readonly budget?: Pick<BifrostBudget, 'max_limit' | 'reset_duration' | 'calendar_aligned'>
  readonly rate_limit?: Pick<BifrostRateLimit, 'token_max_limit' | 'token_reset_duration' | 'request_max_limit' | 'request_reset_duration'>
  readonly is_active?: boolean
}

export interface VirtualKeyResponse {
  readonly message: string
  readonly virtual_key: BifrostVirtualKey
}

export interface VirtualKeyListResponse {
  readonly virtual_keys: readonly BifrostVirtualKey[]
}

// === Logging ===

export interface BifrostLogEntry {
  readonly id: string
  readonly parent_request_id?: string
  readonly provider: string
  readonly model: string
  readonly status: 'processing' | 'success' | 'error'
  readonly object: string
  readonly timestamp: string
  readonly number_of_retries?: number
  readonly fallback_index?: number
  readonly latency: number
  readonly cost: number
  readonly selected_key_id?: string
  readonly selected_key_name?: string
  readonly virtual_key_id?: string
  readonly virtual_key_name?: string | null
  readonly input_tokens?: number
  readonly output_tokens?: number
  readonly total_tokens?: number
}

export interface BifrostLogsQuery {
  readonly providers?: string
  readonly models?: string
  readonly status?: string
  readonly virtual_key_ids?: string
  readonly start_time?: string
  readonly end_time?: string
  readonly min_cost?: number
  readonly max_cost?: number
  readonly limit?: number
  readonly offset?: number
  readonly sort_by?: string
  readonly order?: string
}

export interface BifrostLogsResponse {
  readonly logs: readonly BifrostLogEntry[]
  readonly total?: number
}

export interface BifrostLogsStats {
  readonly total_requests: number
  readonly total_cost: number
  readonly total_tokens: number
  readonly avg_latency: number
}

// === Models ===

export interface BifrostModel {
  readonly id: string
  readonly canonical_slug?: string
  readonly name?: string
  readonly deployment?: string
  readonly created?: number
  readonly context_length?: number
  readonly max_input_tokens?: number
  readonly max_output_tokens?: number
}

export interface BifrostModelsQuery {
  readonly provider?: string
  readonly page_size?: number
  readonly page_token?: string
}

export interface BifrostModelsResponse {
  readonly data: readonly BifrostModel[]
}
