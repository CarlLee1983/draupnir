// src/Modules/Credit/__tests__/TransactionType.test.ts
import { describe, it, expect } from 'vitest'
import { TransactionType } from '../Domain/ValueObjects/TransactionType'

describe('TransactionType', () => {
  it('應建立所有有效的交易類型', () => {
    expect(TransactionType.topup().getValue()).toBe('topup')
    expect(TransactionType.deduction().getValue()).toBe('deduction')
    expect(TransactionType.refund().getValue()).toBe('refund')
    expect(TransactionType.expiry().getValue()).toBe('expiry')
    expect(TransactionType.adjustment().getValue()).toBe('adjustment')
  })

  it('從字串重建應正確', () => {
    const t = TransactionType.from('topup')
    expect(t.getValue()).toBe('topup')
  })

  it('無效類型應拋出錯誤', () => {
    expect(() => TransactionType.from('invalid')).toThrow('Invalid transaction type')
  })

  it('isCredit 應正確判斷入帳類型', () => {
    expect(TransactionType.topup().isCredit()).toBe(true)
    expect(TransactionType.refund().isCredit()).toBe(true)
    expect(TransactionType.deduction().isCredit()).toBe(false)
  })

  it('isDebit 應正確判斷出帳類型', () => {
    expect(TransactionType.deduction().isDebit()).toBe(true)
    expect(TransactionType.expiry().isDebit()).toBe(true)
    expect(TransactionType.topup().isDebit()).toBe(false)
  })
})
