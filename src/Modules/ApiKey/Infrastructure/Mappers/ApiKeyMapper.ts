import type { ApiKey } from '../../Domain/Aggregates/ApiKey'

export function toDatabaseRow(entity: ApiKey): Record<string, unknown> {
  return {
    id: entity.id,
    org_id: entity.orgId,
    created_by_user_id: entity.createdByUserId,
    label: entity.label,
    key_hash: entity.keyHashValue,
    bifrost_virtual_key_id: entity.gatewayKeyId,
    bifrost_key_value: entity.gatewayKeyValue,
    status: entity.status,
    scope: JSON.stringify(entity.scope.toJSON()),
    quota_allocated: entity.quotaAllocated,
    assigned_member_id: entity.assignedMemberId,
    suspension_reason: entity.suspensionReason,
    pre_freeze_rate_limit: entity.preFreezeRateLimitRaw,
    suspended_at: entity.suspendedAt?.toISOString() ?? null,
    expires_at: entity.expiresAt?.toISOString() ?? null,
    revoked_at: entity.revokedAt?.toISOString() ?? null,
    created_at: entity.createdAt.toISOString(),
    updated_at: entity.updatedAt.toISOString(),
  }
}
