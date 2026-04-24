// src/Modules/Contract/__tests__/ContractLifecycle.test.ts
import { beforeEach, describe, expect, test } from 'bun:test'
import { ActivateContractService } from '../Application/Services/ActivateContractService'
import { CreateContractService } from '../Application/Services/CreateContractService'
import { RenewContractService } from '../Application/Services/RenewContractService'
import { TerminateContractService } from '../Application/Services/TerminateContractService'
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
  allowedModules: ['chat'],
  rateLimit: { rpm: 60, tpm: 100000 },
  validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' },
}

describe('Contract Lifecycle', () => {
  let repo: InMemoryContractRepository
  let createService: CreateContractService
  let activateService: ActivateContractService
  let terminateService: TerminateContractService
  let renewService: RenewContractService

  beforeEach(() => {
    repo = new InMemoryContractRepository()
    createService = new CreateContractService(repo)
    activateService = new ActivateContractService(repo)
    terminateService = new TerminateContractService(repo)
    renewService = new RenewContractService(repo)
  })

  test('完整生命週期: DRAFT → ACTIVE → TERMINATED', async () => {
    const created = await createService.execute({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    const contractId = created.data?.id as string

    const activated = await activateService.execute(contractId, 'admin')
    expect(activated.success).toBe(true)
    expect(activated.data?.status).toBe('active')

    const terminated = await terminateService.execute(contractId, 'admin')
    expect(terminated.success).toBe(true)
    expect(terminated.data?.status).toBe('terminated')
  })

  test('續約: ACTIVE → EXPIRED + 新 ACTIVE', async () => {
    const created = await createService.execute({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    const contractId = created.data?.id as string
    await activateService.execute(contractId, 'admin')

    const newTerms = { ...validTerms, creditQuota: 20000 }
    const renewed = await renewService.execute(contractId, newTerms, 'admin-1', 'admin')
    expect(renewed.success).toBe(true)
    expect(renewed.data?.status).toBe('active')
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    expect((renewed.data?.terms as any).creditQuota).toBe(20000)

    // 舊合約應為 expired
    const old = await repo.findById(contractId)
    expect(old?.status).toBe('expired')
  })

  test('不存在的合約回傳 NOT_FOUND', async () => {
    const result = await activateService.execute('nonexistent', 'admin')
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })
})
