// src/Modules/AppModule/__tests__/CheckModuleAccessService.test.ts
import { beforeEach, describe, expect, test } from 'bun:test'
import type { Contract as ContractType } from '@/Modules/Contract/Domain/Aggregates/Contract'
import { Contract } from '@/Modules/Contract/Domain/Aggregates/Contract'
import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import { CheckModuleAccessService } from '../Application/Services/CheckModuleAccessService'
import type { AppModule as AppModuleType } from '../Domain/Aggregates/AppModule'
import { AppModule } from '../Domain/Aggregates/AppModule'
import type { ModuleSubscription as SubType } from '../Domain/Entities/ModuleSubscription'
import { ModuleSubscription } from '../Domain/Entities/ModuleSubscription'
import type { IAppModuleRepository } from '../Domain/Repositories/IAppModuleRepository'
import type { IModuleSubscriptionRepository } from '../Domain/Repositories/IModuleSubscriptionRepository'

class MockContractRepo implements IContractRepository {
  contracts: Map<string, ContractType> = new Map()
  async findById(id: string) {
    return this.contracts.get(id) ?? null
  }
  async findActiveByTargetId(targetId: string) {
    for (const c of this.contracts.values()) {
      if (c.targetId === targetId && c.status === 'active') return c
    }
    return null
  }
  async findByTargetId() {
    return []
  }
  async findAllOrdered() {
    return [...this.contracts.values()]
  }
  async findExpiring() {
    return []
  }
  async findExpired() {
    return []
  }
  async save(c: ContractType) {
    this.contracts.set(c.id, c)
  }
  async update(c: ContractType) {
    this.contracts.set(c.id, c)
  }
}

class MockModuleRepo implements IAppModuleRepository {
  modules: Map<string, AppModuleType> = new Map()
  async findById(id: string) {
    return this.modules.get(id) ?? null
  }
  async findByName(name: string) {
    for (const m of this.modules.values()) {
      if (m.name === name) return m
    }
    return null
  }
  async findAll() {
    return [...this.modules.values()]
  }
  async save(m: AppModuleType) {
    this.modules.set(m.id, m)
  }
  async update(m: AppModuleType) {
    this.modules.set(m.id, m)
  }
}

class MockSubscriptionRepo implements IModuleSubscriptionRepository {
  subs: Map<string, SubType> = new Map()
  async findById(id: string) {
    return this.subs.get(id) ?? null
  }
  async findByOrgAndModule(orgId: string, moduleId: string) {
    for (const s of this.subs.values()) {
      if (s.orgId === orgId && s.moduleId === moduleId) return s
    }
    return null
  }
  async findActiveByOrgId(orgId: string) {
    return [...this.subs.values()].filter((s) => s.orgId === orgId && s.isActive())
  }
  async save(s: SubType) {
    this.subs.set(s.id, s)
  }
  async update(s: SubType) {
    this.subs.set(s.id, s)
  }
}

describe('CheckModuleAccessService', () => {
  let contractRepo: MockContractRepo
  let moduleRepo: MockModuleRepo
  let subRepo: MockSubscriptionRepo
  let service: CheckModuleAccessService

  const chatModule = AppModule.create({ id: 'mod-chat', name: 'chat', type: 'paid' })

  beforeEach(() => {
    contractRepo = new MockContractRepo()
    moduleRepo = new MockModuleRepo()
    subRepo = new MockSubscriptionRepo()
    service = new CheckModuleAccessService(contractRepo, subRepo, moduleRepo)

    moduleRepo.modules.set(chatModule.id, chatModule)
  })

  test('合約 + 訂閱都滿足 → allowed', async () => {
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: {
        creditQuota: 1000,
        allowedModules: ['chat'],
        rateLimit: { rpm: 60, tpm: 100000 },
        validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' },
      },
      createdBy: 'admin',
    }).activate()
    contractRepo.contracts.set(contract.id, contract)

    const sub = ModuleSubscription.create('org-1', 'mod-chat')
    subRepo.subs.set(sub.id, sub)

    const result = await service.execute('org-1', 'chat')
    expect(result.allowed).toBe(true)
  })

  test('無合約 → denied', async () => {
    const sub = ModuleSubscription.create('org-1', 'mod-chat')
    subRepo.subs.set(sub.id, sub)

    const result = await service.execute('org-1', 'chat')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('No valid contract')
  })

  test('合約不包含模組 → denied', async () => {
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: {
        creditQuota: 1000,
        allowedModules: ['embedding'],
        rateLimit: { rpm: 60, tpm: 100000 },
        validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' },
      },
      createdBy: 'admin',
    }).activate()
    contractRepo.contracts.set(contract.id, contract)

    const result = await service.execute('org-1', 'chat')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('is not in the contract allowed list')
  })

  test('合約有但未訂閱 → denied', async () => {
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: {
        creditQuota: 1000,
        allowedModules: ['chat'],
        rateLimit: { rpm: 60, tpm: 100000 },
        validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' },
      },
      createdBy: 'admin',
    }).activate()
    contractRepo.contracts.set(contract.id, contract)

    const result = await service.execute('org-1', 'chat')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('has not subscribed to module')
  })

  test('模組不存在 → denied', async () => {
    const result = await service.execute('org-1', 'nonexistent')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('does not exist or is disabled')
  })
})
