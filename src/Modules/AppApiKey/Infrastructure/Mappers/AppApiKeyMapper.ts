import type { AppApiKey } from '../../Domain/Aggregates/AppApiKey'

export const AppApiKeyMapper = {
  toDatabaseRow(entity: AppApiKey): Record<string, unknown> {
    return {
      id: entity.id,
      org_id: entity.orgId,
      issued_by_user_id: entity.issuedByUserId,
      label: entity.label,
      key_hash: entity.keyHashValue,
      bifrost_virtual_key_id: entity.gatewayKeyId,
      status: entity.status,
      scope: entity.appKeyScope.getValue(),
      rotation_policy: JSON.stringify(entity.rotationPolicy.toJSON()),
      bound_modules: JSON.stringify(entity.boundModules.toJSON()),
      previous_key_hash: entity.previousKeyHash,
      previous_bifrost_virtual_key_id: entity.previousGatewayKeyId,
      grace_period_ends_at: entity.gracePeriodEndsAt?.toISOString() ?? null,
      expires_at: entity.expiresAt?.toISOString() ?? null,
      revoked_at: entity.revokedAt?.toISOString() ?? null,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    }
  },
}
