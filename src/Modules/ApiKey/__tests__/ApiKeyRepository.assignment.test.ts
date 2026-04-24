import { beforeAll, describe, expect, it } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'

const hashingService = new KeyHashingService()

let hashes: Record<string, string> = {}

beforeAll(async () => {
  const rawKeys = [
    'drp_sk_assign_k1',
    'drp_sk_assign_k2',
    'drp_sk_assign_k3',
    'drp_sk_assign_k4',
    'drp_sk_count_a1',
    'drp_sk_count_a2',
    'drp_sk_count_a3',
    'drp_sk_clear_1',
  ]
  const entries = await Promise.all(
    rawKeys.map(async (k) => [k, await hashingService.hash(k)] as const),
  )
  hashes = Object.fromEntries(entries)
})

describe('ApiKeyRepository.findByOrgAndAssignedMember', () => {
  it('只回傳符合 org + assignedMemberId 的 key', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new ApiKeyRepository(db)

    // k1: org-A, user-1 (should appear)
    const k1 = ApiKey.create({
      id: 'assign-k1',
      orgId: 'org-A',
      createdByUserId: 'creator-1',
      label: 'Key 1',
      gatewayKeyId: 'bfr-vk-assign-k1',
      keyHash: hashes.drp_sk_assign_k1,
    }).assignTo('user-1')

    // k2: org-A, user-2 (different member — must not appear)
    const k2 = ApiKey.create({
      id: 'assign-k2',
      orgId: 'org-A',
      createdByUserId: 'creator-1',
      label: 'Key 2',
      gatewayKeyId: 'bfr-vk-assign-k2',
      keyHash: hashes.drp_sk_assign_k2,
    }).assignTo('user-2')

    // k3: org-B, user-1 (cross-org — must not appear)
    const k3 = ApiKey.create({
      id: 'assign-k3',
      orgId: 'org-B',
      createdByUserId: 'creator-1',
      label: 'Key 3',
      gatewayKeyId: 'bfr-vk-assign-k3',
      keyHash: hashes.drp_sk_assign_k3,
    }).assignTo('user-1')

    // k4: org-A, unassigned (must not appear)
    const k4 = ApiKey.create({
      id: 'assign-k4',
      orgId: 'org-A',
      createdByUserId: 'creator-1',
      label: 'Key 4',
      gatewayKeyId: 'bfr-vk-assign-k4',
      keyHash: hashes.drp_sk_assign_k4,
    })

    await repo.save(k1)
    await repo.save(k2)
    await repo.save(k3)
    await repo.save(k4)

    const results = await repo.findByOrgAndAssignedMember('org-A', 'user-1')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('assign-k1')
  })
})

describe('ApiKeyRepository.countByOrgAndAssignedMember', () => {
  it('正確計算指定 org + member 的 key 數量', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new ApiKeyRepository(db)

    // 2 keys for user-1, 1 for user-2
    const a1 = ApiKey.create({
      id: 'count-a1',
      orgId: 'org-A',
      createdByUserId: 'creator-1',
      label: 'Count A1',
      gatewayKeyId: 'bfr-vk-count-a1',
      keyHash: hashes.drp_sk_count_a1,
    }).assignTo('user-1')

    const a2 = ApiKey.create({
      id: 'count-a2',
      orgId: 'org-A',
      createdByUserId: 'creator-1',
      label: 'Count A2',
      gatewayKeyId: 'bfr-vk-count-a2',
      keyHash: hashes.drp_sk_count_a2,
    }).assignTo('user-1')

    const a3 = ApiKey.create({
      id: 'count-a3',
      orgId: 'org-A',
      createdByUserId: 'creator-1',
      label: 'Count A3',
      gatewayKeyId: 'bfr-vk-count-a3',
      keyHash: hashes.drp_sk_count_a3,
    }).assignTo('user-2')

    await repo.save(a1)
    await repo.save(a2)
    await repo.save(a3)

    const countUser1 = await repo.countByOrgAndAssignedMember('org-A', 'user-1')
    const countUser2 = await repo.countByOrgAndAssignedMember('org-A', 'user-2')

    expect(countUser1).toBe(2)
    expect(countUser2).toBe(1)
  })
})

describe('ApiKeyRepository.clearAssignmentsForMember', () => {
  it('清除後 key 仍存在但 assignedMemberId 為 null', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new ApiKeyRepository(db)

    const key = ApiKey.create({
      id: 'clear-1',
      orgId: 'org-A',
      createdByUserId: 'creator-1',
      label: 'Clear Test',
      gatewayKeyId: 'bfr-vk-clear-1',
      keyHash: hashes.drp_sk_clear_1,
    }).assignTo('user-1')

    await repo.save(key)

    await repo.clearAssignmentsForMember('org-A', 'user-1')

    const found = await repo.findById('clear-1')
    expect(found).not.toBeNull()
    expect(found?.assignedMemberId).toBeNull()
  })
})
