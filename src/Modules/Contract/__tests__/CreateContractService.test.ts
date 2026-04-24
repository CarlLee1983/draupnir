// src/Modules/Contract/__tests__/CreateContractService.test.ts
import { beforeEach, describe, expect, test } from 'bun:test'
import { CreateContractService } from '../Application/Services/CreateContractService'
import type { Contract } from '../Domain/Aggregates/Contract'
import type { IContractRepository } from '../Domain/Repositories/IContractRepository'

class InMemoryContractRepository implements IContractRepository {
  private contracts: Map<string, Contract> = new Map()

  async findById(id: string): Promise<Contract | null> {
    return this.contracts.get(id) ?? null
  }
  async findActiveByTargetId(targetId: string): Promise<Contract | null> {
    for (const c of this.contracts.values()) {
      if (c.targetId === targetId && c.status === 'active') return c
    }
    return null
  }
  async findByTargetId(targetId: string): Promise<Contract[]> {
    return [...this.contracts.values()].filter((c) => c.targetId === targetId)
  }
  async findAllOrdered(): Promise<Contract[]> {
    return [...this.contracts.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
  }
  async findExpiring(): Promise<Contract[]> {
    return []
  }
  async findExpired(): Promise<Contract[]> {
    return []
  }
  async save(contract: Contract): Promise<void> {
    this.contracts.set(contract.id, contract)
  }
  async update(contract: Contract): Promise<void> {
    this.contracts.set(contract.id, contract)
  }
}

const validTerms = {
  creditQuota: 10000,
  allowedModules: ['chat', 'embedding'],
  rateLimit: { rpm: 60, tpm: 100000 },
  validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' },
}

describe('CreateContractService', () => {
  let service: CreateContractService
  let repo: InMemoryContractRepository

  beforeEach(() => {
    repo = new InMemoryContractRepository()
    service = new CreateContractService(repo)
  })

  test('admin 可建立合約', async () => {
    const result = await service.execute({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('draft')
    expect(result.data?.targetType).toBe('organization')
  })

  test('非 admin 不可建立合約', async () => {
    const result = await service.execute({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('FORBIDDEN')
  })

  test('合約儲存到 Repository', async () => {
    const result = await service.execute({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    const saved = await repo.findById(result.data?.id as string)
    expect(saved).not.toBeNull()
    expect(saved?.targetId).toBe('org-1')
  })
})
