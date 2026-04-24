import type { ApiKey } from '../../Domain/Aggregates/ApiKey'

/** Bifrost budget reset window for member-facing spend caps (maps to `reset_duration`). */
export type KeyBudgetResetPeriod = '7d' | '30d'

export function fromEntity(entity: ApiKey): Record<string, unknown> {
  return {
    id: entity.id,
    orgId: entity.orgId,
    createdByUserId: entity.createdByUserId,
    label: entity.label,
    keyPrefix: `drp_sk_...${entity.keyHashValue.slice(-8)}`,
    gatewayKeyId: entity.gatewayKeyId,
    /** Bifrost secret (`bifrost_key_value`); use as Bearer for gateway LLM calls. */
    gatewayKeyValue: entity.gatewayKeyValue,
    status: entity.status,
    scope: entity.scope.toJSON(),
    suspensionReason: entity.suspensionReason,
    suspendedAt: entity.suspendedAt?.toISOString() ?? null,
    expiresAt: entity.expiresAt?.toISOString() ?? null,
    revokedAt: entity.revokedAt?.toISOString() ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    quotaAllocated: entity.quotaAllocated,
    assignedMemberId: entity.assignedMemberId,
  }
}

export interface CreateApiKeyRequest {
  orgId: string
  createdByUserId: string
  callerSystemRole: string
  label: string
  allowedModels?: string[]
  rateLimitRpm?: number
  rateLimitTpm?: number
  expiresAt?: string
  /** Optional gateway spend cap; requires `budgetResetPeriod` when set. */
  budgetMaxLimit?: number
  budgetResetPeriod?: KeyBudgetResetPeriod
}

export interface UpdateKeyLabelRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
  label: string
}

export interface SetKeyPermissionsRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
  allowedModels?: string[]
  rateLimitRpm?: number | null
  rateLimitTpm?: number | null
}

export interface RevokeApiKeyRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
}

export interface UpdateApiKeyBudgetRequest {
  keyId: string
  orgId: string
  callerUserId: string
  callerSystemRole: string
  budgetMaxLimit: number
  budgetResetPeriod: KeyBudgetResetPeriod
}

export interface ApiKeyResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

export interface ApiKeyCreatedResponse {
  success: boolean
  message: string
  data?: Record<string, unknown> & { rawKey?: string }
  error?: string
}

export interface ListApiKeysResponse {
  success: boolean
  message: string
  data?: {
    keys: Record<string, unknown>[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }
  error?: string
}
