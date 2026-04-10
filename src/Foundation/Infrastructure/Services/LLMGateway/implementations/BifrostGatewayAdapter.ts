/**
 * Adapts BifrostClient to the ILLMGatewayClient interface.
 *
 * @remarks
 * This class owns the translation boundary between gateway-neutral camelCase DTOs
 * and Bifrost's snake_case wire format. No other file should perform this mapping.
 */
import { GatewayError } from '../errors'
import type { GatewayErrorCode } from '../errors'
import type { ILLMGatewayClient } from '../ILLMGatewayClient'
import type {
  CreateKeyRequest,
  KeyResponse,
  LogEntry,
  UpdateKeyRequest,
  UsageQuery,
  UsageStats,
} from '../types'
import { isBifrostApiError, type BifrostClient } from '@draupnir/bifrost-sdk'

export class BifrostGatewayAdapter implements ILLMGatewayClient {
  constructor(private readonly bifrostClient: BifrostClient) {}

  /**
   * Create a new virtual key in Bifrost.
   * Maps camelCase CreateKeyRequest to Bifrost's snake_case CreateVirtualKeyRequest.
   */
  async createKey(request: CreateKeyRequest): Promise<KeyResponse> {
    try {
      const vk = await this.bifrostClient.createVirtualKey({
        name: request.name,
        ...(request.customerId !== undefined && { customer_id: request.customerId }),
        ...(request.isActive !== undefined && { is_active: request.isActive }),
        ...(request.rateLimit !== undefined && {
          rate_limit: {
            token_max_limit: request.rateLimit.tokenMaxLimit ?? 0,
            token_reset_duration: request.rateLimit.tokenResetDuration ?? '1m',
            ...(request.rateLimit.requestMaxLimit !== undefined && {
              request_max_limit: request.rateLimit.requestMaxLimit,
            }),
            ...(request.rateLimit.requestResetDuration !== undefined && {
              request_reset_duration: request.rateLimit.requestResetDuration,
            }),
          },
        }),
        ...(request.providerConfigs !== undefined && {
          provider_configs: request.providerConfigs.map((pc) => ({
            provider: pc.provider,
            ...(pc.allowedModels !== undefined && { allowed_models: [...pc.allowedModels] }),
          })),
        }),
      })
      return this.mapKeyResponse(vk)
    } catch (error) {
      this.translateError(error)
    }
  }

  /**
   * Update an existing virtual key in Bifrost.
   * Only defined fields are sent — undefined fields are excluded via conditional spread.
   */
  async updateKey(keyId: string, request: UpdateKeyRequest): Promise<KeyResponse> {
    try {
      const bifrostRequest = {
        ...(request.isActive !== undefined && { is_active: request.isActive }),
        ...(request.rateLimit !== undefined && {
          rate_limit: {
            token_max_limit: request.rateLimit.tokenMaxLimit ?? 0,
            token_reset_duration: request.rateLimit.tokenResetDuration ?? '1m',
            ...(request.rateLimit.requestMaxLimit !== undefined && {
              request_max_limit: request.rateLimit.requestMaxLimit,
            }),
            ...(request.rateLimit.requestResetDuration !== undefined && {
              request_reset_duration: request.rateLimit.requestResetDuration,
            }),
          },
        }),
        ...(request.providerConfigs !== undefined && {
          provider_configs: request.providerConfigs.map((pc) => ({
            provider: pc.provider,
            ...(pc.allowedModels !== undefined && { allowed_models: [...pc.allowedModels] }),
          })),
        }),
      }
      const vk = await this.bifrostClient.updateVirtualKey(keyId, bifrostRequest)
      return this.mapKeyResponse(vk)
    } catch (error) {
      this.translateError(error)
    }
  }

  /**
   * Delete a virtual key from Bifrost.
   */
  async deleteKey(keyId: string): Promise<void> {
    try {
      await this.bifrostClient.deleteVirtualKey(keyId)
    } catch (error) {
      this.translateError(error)
    }
  }

  /**
   * Fetch aggregated usage statistics from Bifrost logs stats endpoint.
   * @param keyIds - Join with comma for Bifrost virtual_key_ids query param.
   */
  async getUsageStats(keyIds: readonly string[], query?: UsageQuery): Promise<UsageStats> {
    try {
      const stats = await this.bifrostClient.getLogsStats({
        virtual_key_ids: keyIds.join(','),
        ...(query?.startTime !== undefined && { start_time: query.startTime }),
        ...(query?.endTime !== undefined && { end_time: query.endTime }),
        ...(query?.providers !== undefined && { providers: query.providers }),
        ...(query?.models !== undefined && { models: query.models }),
        ...(query?.limit !== undefined && { limit: query.limit }),
      })
      return {
        totalRequests: stats.total_requests,
        totalCost: stats.total_cost,
        totalTokens: stats.total_tokens,
        avgLatency: stats.avg_latency,
      }
    } catch (error) {
      this.translateError(error)
    }
  }

  /**
   * Fetch individual log entries from Bifrost logs endpoint.
   * Maps BifrostLogEntry's snake_case fields to camelCase LogEntry.
   */
  async getUsageLogs(keyIds: readonly string[], query?: UsageQuery): Promise<readonly LogEntry[]> {
    try {
      const response = await this.bifrostClient.getLogs({
        virtual_key_ids: keyIds.join(','),
        ...(query?.startTime !== undefined && { start_time: query.startTime }),
        ...(query?.endTime !== undefined && { end_time: query.endTime }),
        ...(query?.providers !== undefined && { providers: query.providers }),
        ...(query?.models !== undefined && { models: query.models }),
        ...(query?.limit !== undefined && { limit: query.limit }),
      })
      return response.logs.map((entry) => ({
        timestamp: entry.timestamp,
        keyId: entry.virtual_key_id ?? '',
        model: entry.model,
        provider: entry.provider,
        inputTokens: entry.input_tokens ?? 0,
        outputTokens: entry.output_tokens ?? 0,
        totalTokens: entry.total_tokens ?? 0,
        latencyMs: entry.latency,
        cost: entry.cost,
        status: entry.status === 'success' ? 'success' : 'error',
      }))
    } catch (error) {
      this.translateError(error)
    }
  }

  private mapKeyResponse(vk: {
    readonly id: string
    readonly name: string
    readonly value?: string
    readonly is_active: boolean
  }): KeyResponse {
    return {
      id: vk.id,
      name: vk.name,
      ...(vk.value !== undefined && { value: vk.value }),
      isActive: vk.is_active,
    }
  }

  private mapStatusToCode(status: number): GatewayErrorCode {
    if (status === 404) return 'NOT_FOUND'
    if (status === 401 || status === 403) return 'UNAUTHORIZED'
    if (status === 400 || status === 422) return 'VALIDATION'
    if (status === 429) return 'RATE_LIMITED'
    if (status === 502 || status === 503 || status === 504) return 'NETWORK'
    return 'UNKNOWN'
  }

  private isRetryable(status: number): boolean {
    return status === 429 || status === 502 || status === 503 || status === 504
  }

  /**
   * Translates BifrostApiError and TypeError to GatewayError.
   * Never returns — always throws.
   */
  private translateError(error: unknown): never {
    if (isBifrostApiError(error)) {
      const code = this.mapStatusToCode(error.status)
      const retryable = this.isRetryable(error.status)
      throw new GatewayError(error.message, code, error.status, retryable, error)
    }
    if (error instanceof TypeError) {
      throw new GatewayError('Network error', 'NETWORK', 0, true, error)
    }
    const cause = error instanceof Error ? error : new Error(String(error))
    throw new GatewayError('Unknown gateway error', 'UNKNOWN', 0, false, cause)
  }
}
