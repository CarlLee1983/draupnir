// src/Modules/Contract/__tests__/Contract.test.ts
import { describe, test, expect } from 'bun:test'
import { Contract } from '../Domain/Aggregates/Contract'

const validTerms = {
  creditQuota: 10000,
  allowedModules: ['chat', 'embedding'],
  rateLimit: { rpm: 60, tpm: 100000 },
  validityPeriod: {
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-12-31T00:00:00Z',
  },
}

describe('Contract', () => {
  test('建立 DRAFT 合約', () => {
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    })
    expect(contract.status).toBe('draft')
    expect(contract.targetType).toBe('organization')
    expect(contract.targetId).toBe('org-1')
    expect(contract.terms.creditQuota).toBe(10000)
    expect(contract.terms.allowedModules).toEqual(['chat', 'embedding'])
  })

  test('activate: DRAFT → ACTIVE', () => {
    const draft = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    })
    const active = draft.activate()
    expect(active.status).toBe('active')
    expect(active.id).toBe(draft.id)
  })

  test('expire: ACTIVE → EXPIRED', () => {
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    }).activate()
    const expired = contract.expire()
    expect(expired.status).toBe('expired')
  })

  test('terminate: ACTIVE → TERMINATED', () => {
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    }).activate()
    const terminated = contract.terminate()
    expect(terminated.status).toBe('terminated')
  })

  test('DRAFT 不可直接 expire', () => {
    const draft = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    })
    expect(() => draft.expire()).toThrow()
  })

  test('updateTerms 僅 DRAFT 可修改', () => {
    const draft = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    })
    const updated = draft.updateTerms({
      ...validTerms,
      creditQuota: 20000,
    })
    expect(updated.terms.creditQuota).toBe(20000)
  })

  test('ACTIVE 合約不可 updateTerms', () => {
    const active = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    }).activate()
    expect(() => active.updateTerms(validTerms)).toThrow('僅 DRAFT 狀態的合約可修改條款')
  })

  test('assignTo 僅 DRAFT 可重新指派', () => {
    const draft = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    })
    const reassigned = draft.assignTo('user', 'user-1')
    expect(reassigned.targetType).toBe('user')
    expect(reassigned.targetId).toBe('user-1')
  })

  test('hasModule 檢查模組存取', () => {
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    })
    expect(contract.hasModule('chat')).toBe(true)
    expect(contract.hasModule('image-gen')).toBe(false)
  })

  test('fromDatabase 與 toDatabaseRow 往返', () => {
    const original = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    })
    const row = original.toDatabaseRow()
    const restored = Contract.fromDatabase(row)
    expect(restored.id).toBe(original.id)
    expect(restored.status).toBe(original.status)
    expect(restored.targetType).toBe(original.targetType)
    expect(restored.terms.creditQuota).toBe(original.terms.creditQuota)
  })

  test('toDTO 輸出正確', () => {
    const contract = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    })
    const dto = contract.toDTO()
    expect(dto.targetType).toBe('organization')
    expect(dto.status).toBe('draft')
    expect((dto.terms as any).allowedModules).toEqual(['chat', 'embedding'])
  })

  test('immutability: activate 回傳新實例', () => {
    const draft = Contract.create({
      targetType: 'organization',
      targetId: 'org-1',
      terms: validTerms,
      createdBy: 'admin-1',
    })
    const active = draft.activate()
    expect(draft.status).toBe('draft')
    expect(active.status).toBe('active')
  })
})
