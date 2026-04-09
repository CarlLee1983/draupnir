// src/Modules/Credit/__tests__/CreditAccount.test.ts
import { describe, it, expect } from 'vitest'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'

describe('CreditAccount', () => {
  it('應建立新帳戶（餘額為 0）', () => {
    const account = CreditAccount.create('acc-1', 'org-1')
    expect(account.id).toBe('acc-1')
    expect(account.orgId).toBe('org-1')
    expect(account.balance).toBe('0')
    expect(account.status).toBe('active')
  })

  it('從 DB 重建應正確', () => {
    const account = CreditAccount.fromDatabase({
      id: 'acc-1',
      org_id: 'org-1',
      balance: '500.123',
      low_balance_threshold: '50',
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    expect(account.balance).toBe('500.123')
    expect(account.lowBalanceThreshold).toBe('50')
  })

  it('applyTopUp 應增加餘額', () => {
    const account = CreditAccount.create('acc-1', 'org-1')
    const updated = account.applyTopUp('100.5')
    expect(updated.balance).toBe('100.5')
  })

  it('applyDeduction 應減少餘額', () => {
    const account = CreditAccount.fromDatabase({
      id: 'acc-1', org_id: 'org-1', balance: '100',
      low_balance_threshold: '10', status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    const updated = account.applyDeduction('30')
    expect(updated.balance).toBe('70')
  })

  it('isBalanceLow 應依閾值判斷', () => {
    const account = CreditAccount.fromDatabase({
      id: 'acc-1', org_id: 'org-1', balance: '5',
      low_balance_threshold: '10', status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    expect(account.isBalanceLow()).toBe(true)
  })

  it('isBalanceDepleted 應正確判斷', () => {
    const account = CreditAccount.fromDatabase({
      id: 'acc-1', org_id: 'org-1', balance: '0',
      low_balance_threshold: '10', status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    expect(account.isBalanceDepleted()).toBe(true)
  })

  it('toDatabaseRow 應正確映射', () => {
    const account = CreditAccount.create('acc-1', 'org-1')
    const row = account.toDatabaseRow()
    expect(row.id).toBe('acc-1')
    expect(row.org_id).toBe('org-1')
    expect(row.balance).toBe('0')
  })
})
