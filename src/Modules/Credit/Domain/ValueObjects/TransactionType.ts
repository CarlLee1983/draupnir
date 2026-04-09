// src/Modules/Credit/Domain/ValueObjects/TransactionType.ts
export const TransactionTypeValues = ['topup', 'deduction', 'refund', 'expiry', 'adjustment'] as const
export type TransactionTypeValue = (typeof TransactionTypeValues)[number]

const CREDIT_TYPES: ReadonlySet<TransactionTypeValue> = new Set(['topup', 'refund'])
const DEBIT_TYPES: ReadonlySet<TransactionTypeValue> = new Set(['deduction', 'expiry', 'adjustment'])

export class TransactionType {
  private constructor(private readonly value: TransactionTypeValue) {}

  static topup(): TransactionType { return new TransactionType('topup') }
  static deduction(): TransactionType { return new TransactionType('deduction') }
  static refund(): TransactionType { return new TransactionType('refund') }
  static expiry(): TransactionType { return new TransactionType('expiry') }
  static adjustment(): TransactionType { return new TransactionType('adjustment') }

  static from(value: string): TransactionType {
    if (!TransactionTypeValues.includes(value as TransactionTypeValue)) {
      throw new Error(`無效的交易類型: ${value}`)
    }
    return new TransactionType(value as TransactionTypeValue)
  }

  isCredit(): boolean { return CREDIT_TYPES.has(this.value) }
  isDebit(): boolean { return DEBIT_TYPES.has(this.value) }
  getValue(): TransactionTypeValue { return this.value }
}
