// src/Modules/Contract/__tests__/ContractEnforcementService.test.ts
import { describe, expect, test } from 'bun:test'
import { Contract } from '../Domain/Aggregates/Contract'
import { ContractEnforcementService } from '../Domain/Services/ContractEnforcementService'

const enforcementService = new ContractEnforcementService()

const validTerms = {
  creditQuota: 1000,
  allowedModules: ['chat', 'embedding'],
  rateLimit: { rpm: 60, tpm: 100000 },
  validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' },
}

describe('ContractEnforcementService', () => {
  test('null 合約 → 不允許', () => {
    const result = enforcementService.checkModuleAccess(null, 'chat')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('No valid contract')
  })

  test('DRAFT 合約 → 不允許', () => {
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin',
    })
    const result = enforcementService.checkModuleAccess(contract, 'chat')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('not ACTIVE')
  })

  test('ACTIVE 合約 + 模組在清單中 → 允許', () => {
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin',
    }).activate()
    const result = enforcementService.checkModuleAccess(contract, 'chat')
    expect(result.allowed).toBe(true)
  })

  test('ACTIVE 合約 + 模組不在清單中 → 不允許', () => {
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin',
    }).activate()
    const result = enforcementService.checkModuleAccess(contract, 'image-gen')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('not in the contract allowed list')
  })
})
