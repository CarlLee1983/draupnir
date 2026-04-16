// src/Modules/Contract/__tests__/AdjustContractQuotaService.test.ts

import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { AdjustContractQuotaService } from '../Application/Services/AdjustContractQuotaService'
import type { IContractRepository } from '../Domain/Repositories/IContractRepository'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import { Contract } from '../Domain/Aggregates/Contract'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'

// 建立測試用的 Contract（ACTIVE 狀態）
function makeContract(id: string, creditQuota: number, targetId: string): Contract {
  const draft = Contract.create({
    id,
    targetType: 'organization',
    targetId,
    terms: {
      creditQuota,
      allowedModules: ['chat'],
      rateLimit: { rpm: 60, tpm: 100_000 },
      validityPeriod: { startDate: '2025-01-01', endDate: '2025-12-31' },
    },
    createdBy: 'admin-user',
  })
  return draft.activate()
}

// 建立測試用的 ApiKey
function makeApiKey(id: string, orgId: string, quotaAllocated: number): ApiKey {
  const key = ApiKey.create({
    id,
    orgId,
    createdByUserId: 'user-1',
    label: `key-${id}`,
    gatewayKeyId: `gw-${id}`,
    keyHash: 'abc123hash',
  })
  return key.activate().adjustQuotaAllocated(quotaAllocated)
}

describe('AdjustContractQuotaService', () => {
  let contractRepo: IContractRepository
  let keyRepo: IApiKeyRepository
  let service: AdjustContractQuotaService

  beforeEach(() => {
    contractRepo = {
      findById: mock(() => Promise.resolve(null)),
      findActiveByTargetId: mock(() => Promise.resolve(null)),
      findByTargetId: mock(() => Promise.resolve([])),
      findAllOrdered: mock(() => Promise.resolve([])),
      findExpiring: mock(() => Promise.resolve([])),
      findExpired: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
      update: mock(() => Promise.resolve()),
    }

    keyRepo = {
      findById: mock(() => Promise.resolve(null)),
      findByOrgId: mock(() => Promise.resolve([])),
      findActiveByOrgId: mock(() => Promise.resolve([])),
      findSuspendedByOrgId: mock(() => Promise.resolve([])),
      findByKeyHash: mock(() => Promise.resolve(null)),
      save: mock(() => Promise.resolve()),
      update: mock(() => Promise.resolve()),
      delete: mock(() => Promise.resolve()),
      countByOrgId: mock(() => Promise.resolve(0)),
      sumQuotaAllocatedActiveByOrgId: mock(() => Promise.resolve(0)),
      countActiveByOrgId: mock(() => Promise.resolve(0)),
      findByBifrostVirtualKeyId: mock(() => Promise.resolve(null)),
      findByOrgAndAssignedMember: mock(() => Promise.resolve([])),
      countByOrgAndAssignedMember: mock(() => Promise.resolve(0)),
      clearAssignmentsForMember: mock(() => Promise.resolve()),
      withTransaction: mock(() => keyRepo),
    }

    service = new AdjustContractQuotaService(contractRepo, keyRepo)
  })

  // QUOTA-01: 非 admin 呼叫 → FORBIDDEN
  it('QUOTA-01: 非 admin 呼叫應回傳 FORBIDDEN', async () => {
    const result = await service.execute({
      contractId: 'contract-1',
      newCap: 1000,
      callerRole: 'member',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('FORBIDDEN')
  })

  // QUOTA-02: newCap >= sumAllocated → 合約更新但 key 不變
  it('QUOTA-02: newCap >= sumAllocated 時只更新合約，不調整 key', async () => {
    const contract = makeContract('contract-2', 1000, 'org-2')
    const key1 = makeApiKey('key-1', 'org-2', 300)
    const key2 = makeApiKey('key-2', 'org-2', 200)
    // sumAllocated = 500

    ;(contractRepo.findById as ReturnType<typeof mock>).mockResolvedValue(contract)
    ;(keyRepo.findActiveByOrgId as ReturnType<typeof mock>).mockResolvedValue([key1, key2])

    const result = await service.execute({
      contractId: 'contract-2',
      newCap: 600, // 600 >= 500，不需縮減
      callerRole: 'admin',
    })

    expect(result.success).toBe(true)
    expect(result.data?.newCap).toBe(600)
    expect(result.data?.changes).toHaveLength(0)
    // 應呼叫合約 update，但不呼叫 key update
    expect(contractRepo.update).toHaveBeenCalledTimes(1)
    expect(keyRepo.update).not.toHaveBeenCalled()
  })

  // QUOTA-03: newCap < sumAllocated → 比例縮減，ΣnewAllocated = newCap（400 = 200+200）
  it('QUOTA-03: newCap < sumAllocated 時比例縮減，總和等於 newCap', async () => {
    const contract = makeContract('contract-3', 1000, 'org-3')
    const key1 = makeApiKey('key-3a', 'org-3', 500)
    const key2 = makeApiKey('key-3b', 'org-3', 500)
    // sumAllocated = 1000，newCap = 400 < 1000

    ;(contractRepo.findById as ReturnType<typeof mock>).mockResolvedValue(contract)
    ;(keyRepo.findActiveByOrgId as ReturnType<typeof mock>).mockResolvedValue([key1, key2])

    const result = await service.execute({
      contractId: 'contract-3',
      newCap: 400,
      callerRole: 'admin',
    })

    expect(result.success).toBe(true)
    expect(result.data?.newCap).toBe(400)
    expect(result.data?.changes).toHaveLength(2)

    // 兩個 key 各 50%，總和應等於 400
    const totalNew = result.data!.changes.reduce((s, c) => s + c.newAllocated, 0)
    expect(totalNew).toBe(400)

    // 每個 key 應分得 200
    expect(result.data!.changes[0].newAllocated).toBe(200)
    expect(result.data!.changes[1].newAllocated).toBe(200)

    expect(contractRepo.update).toHaveBeenCalledTimes(1)
    expect(keyRepo.update).toHaveBeenCalledTimes(2)
  })

  // QUOTA-04: 合約不存在 → NOT_FOUND
  it('QUOTA-04: 合約不存在應回傳 NOT_FOUND', async () => {
    ;(contractRepo.findById as ReturnType<typeof mock>).mockResolvedValue(null)

    const result = await service.execute({
      contractId: 'nonexistent-contract',
      newCap: 1000,
      callerRole: 'admin',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })

  it('QUOTA-05: newCap 為負數應回傳 INVALID_INPUT', async () => {
    const contractRepo = { findById: mock(() => Promise.resolve(null)), update: mock() }
    const keyRepo = { findActiveByOrgId: mock(() => Promise.resolve([])), update: mock() }
    const svc = new AdjustContractQuotaService(contractRepo as any, keyRepo as any)

    const result = await svc.execute({ contractId: 'contract-1', newCap: -1, callerRole: 'admin' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_INPUT')
  })
})
