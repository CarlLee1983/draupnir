import type { AppApiKey } from '../../Domain/Aggregates/AppApiKey'

export class AppApiKeyPresenter {
  static fromEntity(entity: AppApiKey): Record<string, unknown> {
    return {
      id: entity.id,
      orgId: entity.orgId,
      issuedByUserId: entity.issuedByUserId,
      label: entity.label,
      keyPrefix: `drp_app_...${entity.keyHashValue.slice(-8)}`,
      gatewayKeyId: entity.gatewayKeyId,
      status: entity.status,
      scope: entity.appKeyScope.getValue(),
      rotationPolicy: entity.rotationPolicy.toJSON(),
      boundModules: entity.boundModules.toJSON(),
      isInGracePeriod: entity.gracePeriodEndsAt != null,
      gracePeriodEndsAt: entity.gracePeriodEndsAt?.toISOString() ?? null,
      expiresAt: entity.expiresAt?.toISOString() ?? null,
      revokedAt: entity.revokedAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }
}

export interface IssueAppKeyRequest {
  orgId: string
  issuedByUserId: string
  callerSystemRole: string
  label: string
  scope?: string
  rotationPolicy?: {
    autoRotate: boolean
    rotationIntervalDays?: number
    gracePeriodHours?: number
  }
  boundModuleIds?: string[]
  expiresAt?: string
}

export interface RotateAppKeyRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
}

export interface RevokeAppKeyRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
}

export interface SetAppKeyScopeRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
  scope?: string
  boundModuleIds?: string[]
}

export interface GetAppKeyUsageRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
  startDate?: string
  endDate?: string
}

export interface AppApiKeyResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

export interface AppApiKeyCreatedResponse {
  success: boolean
  message: string
  data?: Record<string, unknown> & { rawKey?: string }
  error?: string
}

export interface ListAppApiKeysResponse {
  success: boolean
  message: string
  data?: {
    keys: Record<string, unknown>[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }
  error?: string
}
