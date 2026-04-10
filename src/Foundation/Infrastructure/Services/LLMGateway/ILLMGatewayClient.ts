/**
 * Gateway-neutral client interface for LLM virtual key management and usage tracking.
 *
 * @remarks
 * Implementations must convert gateway-specific wire formats to these camelCase DTOs.
 * No Bifrost-specific types may appear in implementing classes' public API.
 */
import type {
  CreateKeyRequest,
  KeyResponse,
  LogEntry,
  UpdateKeyRequest,
  UsageQuery,
  UsageStats,
} from './types'

export interface ILLMGatewayClient {
  /**
   * Create a new virtual key in the gateway.
   * @returns Created key metadata including the raw key value (only available on creation).
   */
  createKey(request: CreateKeyRequest): Promise<KeyResponse>

  /**
   * Update an existing key. Only fields present in the request are updated —
   * omitted fields leave the existing gateway state unchanged.
   */
  updateKey(keyId: string, request: UpdateKeyRequest): Promise<KeyResponse>

  /**
   * Permanently delete a virtual key from the gateway.
   */
  deleteKey(keyId: string): Promise<void>

  /**
   * Fetch aggregated usage statistics for one or more keys.
   * @param keyIds - Array of gateway key IDs. Single-key queries pass [keyId].
   */
  getUsageStats(keyIds: readonly string[], query?: UsageQuery): Promise<UsageStats>

  /**
   * Fetch individual log entries for one or more keys.
   * @param keyIds - Array of gateway key IDs. Single-key queries pass [keyId].
   */
  getUsageLogs(keyIds: readonly string[], query?: UsageQuery): Promise<readonly LogEntry[]>
}
