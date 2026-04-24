import type { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { KeyScope } from '@/Modules/ApiKey/Domain/ValueObjects/KeyScope'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedApiKeyInput {
  readonly id: string
  readonly orgId: string
  readonly createdByUserId: string
  readonly label: string
  readonly status: 'pending' | 'active' | 'suspended_no_credit' | 'revoked'
  readonly suspensionReason?: string | null
  readonly preFreezeRateLimit?: { rpm: number | null; tpm: number | null } | null
  readonly scope?: { allowedModels?: readonly string[]; rateLimitRpm?: number; rateLimitTpm?: number }
  readonly keyHash?: string
  readonly gatewayKeyId?: string
  readonly quotaAllocated?: number
}

export interface SeedApiKeyResult {
  readonly id: string
  readonly orgId: string
  readonly gatewayKeyId: string
  readonly status: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedApiKey(
  db: IDatabaseAccess,
  gateway: MockGatewayClient,
  input: SeedApiKeyInput,
): Promise<SeedApiKeyResult> {
  let gatewayKeyId = input.gatewayKeyId
  if (!gatewayKeyId) {
    const res = await gateway.createKey({ name: input.label, isActive: input.status === 'active' })
    gatewayKeyId = res.id
  }

  const scope = KeyScope.create({
    allowedModels: input.scope?.allowedModels ?? ['*'],
    rateLimitRpm: input.scope?.rateLimitRpm ?? null,
    rateLimitTpm: input.scope?.rateLimitTpm ?? null,
  })

  await db.table('api_keys').insert({
    id: input.id,
    org_id: input.orgId,
    created_by_user_id: input.createdByUserId,
    label: input.label,
    key_hash: input.keyHash ?? `acceptance_hash_${input.id}`,
    bifrost_virtual_key_id: gatewayKeyId,
    bifrost_key_value: null,
    status: input.status,
    scope: JSON.stringify(scope.toJSON()),
    quota_allocated: input.quotaAllocated ?? 0,
    assigned_member_id: null,
    suspension_reason: input.suspensionReason ?? null,
    pre_freeze_rate_limit:
      input.preFreezeRateLimit !== undefined && input.preFreezeRateLimit !== null
        ? JSON.stringify(input.preFreezeRateLimit)
        : null,
    suspended_at: input.status === 'suspended_no_credit' ? NOW : null,
    expires_at: null,
    revoked_at: null,
    created_at: NOW,
    updated_at: NOW,
  })

  return {
    id: input.id,
    orgId: input.orgId,
    gatewayKeyId,
    status: input.status,
  }
}
