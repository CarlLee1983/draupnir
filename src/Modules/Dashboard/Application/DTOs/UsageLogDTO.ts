/**
 * UsageLogDTO - Validated shape of a LogEntry as consumed by BifrostSyncService.
 *
 * LogEntry comes from ILLMGatewayClient.getUsageLogs() - already camelCase,
 * already gateway-neutral. BifrostSyncService maps LogEntry -> UsageRecordInsert
 * (after resolving apiKeyId via ApiKeyRepository.findByBifrostVirtualKeyId).
 *
 * This DTO documents the mapping, not a transformation layer.
 * No Zod validation here - LogEntry is typed by the gateway interface.
 */

export interface UsageLogDTO {
  readonly logId?: string
  readonly keyId: string
  readonly model: string
  readonly provider: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly latencyMs: number
  readonly cost: number
  readonly status: 'success' | 'error'
  readonly timestamp: string
}
