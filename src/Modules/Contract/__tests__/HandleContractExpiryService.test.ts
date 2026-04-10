// src/Modules/Contract/__tests__/HandleContractExpiryService.test.ts
import { describe, test, expect } from 'bun:test'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ContractRepository } from '../Infrastructure/Repositories/ContractRepository'
import { HandleContractExpiryService } from '../Application/Services/HandleContractExpiryService'
import { Contract } from '../Domain/Aggregates/Contract'

describe('HandleContractExpiryService', () => {
  test('將 endDate 已過的 ACTIVE 合約標為 EXPIRED', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new ContractRepository(db)
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: {
        creditQuota: 100,
        allowedModules: ['dashboard'],
        rateLimit: { rpm: 60, tpm: 1000 },
        validityPeriod: { startDate: '2020-01-01', endDate: '2020-06-01' },
      },
      createdBy: 'admin',
    }).activate()
    await repo.save(contract)

    const service = new HandleContractExpiryService(repo)
    const result = await service.execute()

    expect(result.expired).toBe(1)
    const updated = await repo.findById(contract.id)
    expect(updated?.status).toBe('expired')
  })
})
