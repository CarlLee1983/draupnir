// src/Modules/Credit/Domain/Entities/CreditTransaction.ts
/**
 * CreditTransaction
 * Domain Entity: represents an individual balance movement (record).
 */

import { TransactionType } from '../ValueObjects/TransactionType'

/** Properties for creating a CreditTransaction. */
interface CreditTransactionProps {
  readonly id: string
  readonly creditAccountId: string
  readonly type: TransactionType
  readonly amount: string
  readonly balanceAfter: string
  readonly referenceType: string | null
  readonly referenceId: string | null
  readonly description: string | null
  readonly createdAt: Date
}

/**
 * CreditTransaction Entity
 * Maintains the history of all credit events for an account.
 */
export class CreditTransaction {
  private readonly props: CreditTransactionProps

  private constructor(props: CreditTransactionProps) {
    this.props = props
  }

  /** Creates a new transaction record. */
  static create(params: {
    id: string
    creditAccountId: string
    type: TransactionType
    amount: string
    balanceAfter: string
    referenceType?: string
    referenceId?: string
    description?: string
  }): CreditTransaction {
    return new CreditTransaction({
      id: params.id,
      creditAccountId: params.creditAccountId,
      type: params.type,
      amount: params.amount,
      balanceAfter: params.balanceAfter,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      description: params.description ?? null,
      createdAt: new Date(),
    })
  }

  /** Reconstitutes a transaction from database record. */
  static fromDatabase(row: Record<string, unknown>): CreditTransaction {
    return new CreditTransaction({
      id: row.id as string,
      creditAccountId: row.credit_account_id as string,
      type: TransactionType.from(row.type as string),
      amount: row.amount as string,
      balanceAfter: row.balance_after as string,
      referenceType: (row.reference_type as string) ?? null,
      referenceId: (row.reference_id as string) ?? null,
      description: (row.description as string) ?? null,
      createdAt: new Date(row.created_at as string),
    })
  }

  /** Unique identifier. */
  get id(): string {
    return this.props.id
  }
  /** Target credit account ID. */
  get creditAccountId(): string {
    return this.props.creditAccountId
  }
  /** Transaction category (topup, deduction, etc.). */
  get type(): string {
    return this.props.type.getValue()
  }
  /** Transacted amount. */
  get amount(): string {
    return this.props.amount
  }
  /** Account balance after this transaction. */
  get balanceAfter(): string {
    return this.props.balanceAfter
  }
  /** Optional reference category (e.g., "contract"). */
  get referenceType(): string | null {
    return this.props.referenceType
  }
  /** ID of the referenced object. */
  get referenceId(): string | null {
    return this.props.referenceId
  }
  /** Human-readable description. */
  get description(): string | null {
    return this.props.description
  }
  /** Creation timestamp. */
  get createdAt(): Date {
    return this.props.createdAt
  }

}

