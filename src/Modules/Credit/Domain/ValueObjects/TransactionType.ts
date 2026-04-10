/**
 * TransactionType Value Object
 * Defines categorized movement of credits (credit vs debit).
 */
export const TransactionTypeValues = [
  'topup',
  'deduction',
  'refund',
  'expiry',
  'adjustment',
] as const

/** Type representing possible transaction categories. */
export type TransactionTypeValue = (typeof TransactionTypeValues)[number]

const CREDIT_TYPES: ReadonlySet<TransactionTypeValue> = new Set(['topup', 'refund'])
const DEBIT_TYPES: ReadonlySet<TransactionTypeValue> = new Set([
  'deduction',
  'expiry',
  'adjustment',
])

export class TransactionType {
  private constructor(private readonly value: TransactionTypeValue) {}

  /** Creates a top-up type. */
  static topup(): TransactionType {
    return new TransactionType('topup')
  }
  /** Creates a deduction type. */
  static deduction(): TransactionType {
    return new TransactionType('deduction')
  }
  /** Creates a refund type. */
  static refund(): TransactionType {
    return new TransactionType('refund')
  }
  /** Creates an expiry type. */
  static expiry(): TransactionType {
    return new TransactionType('expiry')
  }
  /** Creates an adjustment type. */
  static adjustment(): TransactionType {
    return new TransactionType('adjustment')
  }

  /**
   * Creates a TransactionType from a string.
   * @throws {Error} If the value is invalid.
   */
  static from(value: string): TransactionType {
    if (!TransactionTypeValues.includes(value as TransactionTypeValue)) {
      throw new Error(`Invalid transaction type: ${value}`)
    }
    return new TransactionType(value as TransactionTypeValue)
  }

  /** Returns true if the type increases balance. */
  isCredit(): boolean {
    return CREDIT_TYPES.has(this.value)
  }
  /** Returns true if the type decreases balance. */
  isDebit(): boolean {
    return DEBIT_TYPES.has(this.value)
  }
  /** Gets the underlying type value. */
  getValue(): TransactionTypeValue {
    return this.value
  }

  equals(other: unknown): boolean {
    return other instanceof TransactionType && other.value === this.value
  }
}

