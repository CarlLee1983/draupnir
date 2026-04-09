// src/Modules/Credit/Domain/Entities/CreditTransaction.ts
import { TransactionType } from '../ValueObjects/TransactionType'

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

export class CreditTransaction {
  private readonly props: CreditTransactionProps

  private constructor(props: CreditTransactionProps) {
    this.props = props
  }

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

  get id(): string { return this.props.id }
  get creditAccountId(): string { return this.props.creditAccountId }
  get type(): string { return this.props.type.getValue() }
  get amount(): string { return this.props.amount }
  get balanceAfter(): string { return this.props.balanceAfter }
  get referenceType(): string | null { return this.props.referenceType }
  get referenceId(): string | null { return this.props.referenceId }
  get description(): string | null { return this.props.description }
  get createdAt(): Date { return this.props.createdAt }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      credit_account_id: this.props.creditAccountId,
      type: this.props.type.getValue(),
      amount: this.props.amount,
      balance_after: this.props.balanceAfter,
      reference_type: this.props.referenceType,
      reference_id: this.props.referenceId,
      description: this.props.description,
      created_at: this.props.createdAt.toISOString(),
    }
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.props.id,
      creditAccountId: this.props.creditAccountId,
      type: this.props.type.getValue(),
      amount: this.props.amount,
      balanceAfter: this.props.balanceAfter,
      referenceType: this.props.referenceType,
      referenceId: this.props.referenceId,
      description: this.props.description,
      createdAt: this.props.createdAt.toISOString(),
    }
  }
}
