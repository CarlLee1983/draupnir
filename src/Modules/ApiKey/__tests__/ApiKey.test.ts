import { beforeAll, describe, expect, it } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { KeyScope } from '../Domain/ValueObjects/KeyScope'
import { ApiKeyMapper } from '../Infrastructure/Mappers/ApiKeyMapper'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'

const hashingService = new KeyHashingService()

// Pre-compute hashes for test raw keys
let hashes: Record<string, string> = {}

beforeAll(async () => {
  const rawKeys = [
    'drp_sk_test123',
    'drp_sk_pending',
    'drp_sk_act',
    'drp_sk_restricted',
    'drp_sk_revoke',
    'drp_sk_already',
    'drp_sk_pnr',
    'drp_sk_label',
    'drp_sk_scope',
    'drp_sk_rs',
    'drp_sk_db',
    'drp_sk_rebuild',
  ]
  const entries = await Promise.all(
    rawKeys.map(async (k) => [k, await hashingService.hash(k)] as const),
  )
  hashes = Object.fromEntries(entries)
})

describe('ApiKey', () => {
  it('應建立新的 ApiKey（初始為 pending 狀態）', () => {
    const result = ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'My Test Key',
      gatewayKeyId: 'bfr-vk-1',
      keyHash: hashes['drp_sk_test123'],
    })
    expect(result.id).toBe('key-1')
    expect(result.orgId).toBe('org-1')
    expect(result.createdByUserId).toBe('user-1')
    expect(result.label).toBe('My Test Key')
    expect(result.gatewayKeyId).toBe('bfr-vk-1')
    expect(result.status).toBe('pending')
    expect(result.keyHashValue).toMatch(/^[a-f0-9]{64}$/)
    expect(result.scope.getAllowedModels()).toBeNull()
  })

  it('activate 應將 pending 轉為 active', () => {
    const key = ApiKey.create({
      id: 'key-1a',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Pending Key',
      gatewayKeyId: 'bfr-vk-1a',
      keyHash: hashes['drp_sk_pending'],
    })
    expect(key.status).toBe('pending')
    const activated = key.activate()
    expect(activated.status).toBe('active')
  })

  it('已 active 的 key 不能再 activate', () => {
    const key = ApiKey.create({
      id: 'key-1b',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Active Key',
      gatewayKeyId: 'bfr-vk-1b',
      keyHash: hashes['drp_sk_act'],
    })
    const activated = key.activate()
    expect(() => activated.activate()).toThrow()
  })

  it('應建立帶 scope 的 ApiKey', () => {
    const result = ApiKey.create({
      id: 'key-2',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Restricted Key',
      gatewayKeyId: 'bfr-vk-2',
      keyHash: hashes['drp_sk_restricted'],
      scope: KeyScope.create({ allowedModels: ['gpt-4'], rateLimitRpm: 60 }),
    })
    expect(result.scope.getAllowedModels()).toEqual(['gpt-4'])
    expect(result.scope.getRateLimitRpm()).toBe(60)
  })

  it('撤銷後狀態應為 revoked', () => {
    const key = ApiKey.create({
      id: 'key-3',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'To Revoke',
      gatewayKeyId: 'bfr-vk-3',
      keyHash: hashes['drp_sk_revoke'],
    })
    const active = key.activate()
    const revoked = active.revoke()
    expect(revoked.status).toBe('revoked')
    expect(revoked.revokedAt).toBeInstanceOf(Date)
  })

  it('已撤銷的 key 不能再撤銷', () => {
    const key = ApiKey.create({
      id: 'key-4',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Already Revoked',
      gatewayKeyId: 'bfr-vk-4',
      keyHash: hashes['drp_sk_already'],
    })
    const revoked = key.activate().revoke()
    expect(() => revoked.revoke()).toThrow()
  })

  it('pending 狀態的 key 不能撤銷（需先 activate）', () => {
    const key = ApiKey.create({
      id: 'key-4b',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Pending No Revoke',
      gatewayKeyId: 'bfr-vk-4b',
      keyHash: hashes['drp_sk_pnr'],
    })
    expect(() => key.revoke()).toThrow()
  })

  it('應更新 label', () => {
    const key = ApiKey.create({
      id: 'key-5',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Old Label',
      gatewayKeyId: 'bfr-vk-5',
      keyHash: hashes['drp_sk_label'],
    })
    const updated = key.updateLabel('New Label')
    expect(updated.label).toBe('New Label')
  })

  it('應更新 scope', () => {
    const key = ApiKey.create({
      id: 'key-6',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Scope Test',
      gatewayKeyId: 'bfr-vk-6',
      keyHash: hashes['drp_sk_scope'],
    })
    const newScope = KeyScope.create({ rateLimitRpm: 120 })
    const updated = key.updateScope(newScope)
    expect(updated.scope.getRateLimitRpm()).toBe(120)
  })

  it('已撤銷的 key 不能更新 scope', () => {
    const key = ApiKey.create({
      id: 'key-7',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Revoked Scope',
      gatewayKeyId: 'bfr-vk-7',
      keyHash: hashes['drp_sk_rs'],
    })
    const revoked = key.activate().revoke()
    expect(() => revoked.updateScope(KeyScope.unrestricted())).toThrow()
  })

  it('ApiKeyMapper.toDatabaseRow 應正確轉換', () => {
    const key = ApiKey.create({
      id: 'key-8',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'DB Test',
      gatewayKeyId: 'bfr-vk-8',
      keyHash: hashes['drp_sk_db'],
    })
    const row = ApiKeyMapper.toDatabaseRow(key)
    expect(row.id).toBe('key-8')
    expect(row.org_id).toBe('org-1')
    expect(row.created_by_user_id).toBe('user-1')
    expect(row.label).toBe('DB Test')
    expect(row.key_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(row.bifrost_virtual_key_id).toBe('bfr-vk-8')
    expect(row.status).toBe('pending')
    expect(row.scope).toBeTruthy()
  })

  it('fromDatabase 應正確重建', () => {
    const key = ApiKey.create({
      id: 'key-9',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Rebuild',
      gatewayKeyId: 'bfr-vk-9',
      keyHash: hashes['drp_sk_rebuild'],
    })
    const row = ApiKeyMapper.toDatabaseRow(key)
    const rebuilt = ApiKey.fromDatabase(row)
    expect(rebuilt.id).toBe('key-9')
    expect(rebuilt.label).toBe('Rebuild')
    expect(rebuilt.status).toBe('pending')
  })
})

describe('ApiKeyRepository.findByBifrostVirtualKeyId', () => {
  it('應根據 Bifrost virtual key ID 找到 ApiKey', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new ApiKeyRepository(db)
    const key = ApiKey.create({
      id: 'key-vk-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Lookup Key',
      gatewayKeyId: 'bfr-vk-test-1',
      keyHash: hashes['drp_sk_db'],
    })
    await repo.save(key)

    const found = await repo.findByBifrostVirtualKeyId('bfr-vk-test-1')
    expect(found).not.toBeNull()
    expect(found?.id).toBe('key-vk-1')
    expect(found?.gatewayKeyId).toBe('bfr-vk-test-1')
  })

  it('找不到對應的 Bifrost virtual key 時回傳 null', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new ApiKeyRepository(db)

    const found = await repo.findByBifrostVirtualKeyId('missing-vk')
    expect(found).toBeNull()
  })
})
