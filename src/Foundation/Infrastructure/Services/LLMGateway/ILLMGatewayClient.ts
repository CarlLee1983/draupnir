/**
 * Gateway-neutral client interface for LLM virtual key management and usage tracking.
 *
 * @remarks
 * Implementations must convert gateway-specific wire formats to these camelCase DTOs.
 * No Bifrost-specific types may appear in implementing classes' public API.
 */
import type {
  CreateKeyRequest,
  CreateTeamRequest,
  KeyResponse,
  LogEntry,
  TeamResponse,
  UpdateKeyRequest,
  UsageQuery,
  UsageStats,
} from './types'

export interface ILLMGatewayClient {
  /**
   * Create a new team in the gateway.
   *
   * Draupnir provisions one Team per organization; later-issued virtual keys are
   * attached to the Team so per-org spend and usage can be aggregated.
   */
  createTeam(request: CreateTeamRequest): Promise<TeamResponse>

  /**
   * Idempotent Team creation keyed by `name`.
   *
   * Bifrost rejects arbitrary `customer_id` values (must point at an existing
   * Customer entity), so we key idempotency on `name` — which Draupnir sets to
   * `org_id` during provisioning. Returns the existing Team matching `name`
   * when one exists; otherwise creates a new Team. Lets transient gateway
   * failures on first attempt be recovered on retry without producing duplicate Teams.
   */
  ensureTeam(request: CreateTeamRequest): Promise<TeamResponse>

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
