import { Balance } from '../ValueObjects/Balance'

interface CreditAccountProps {
  readonly id: string
  readonly orgId: string
  readonly balance: Balance
  readonly lowBalanceThreshold: Balance
  readonly status: 'active' | 'frozen'
  readonly createdAt: Date
  readonly updatedAt: Date
}

export class CreditAccount {
  private readonly props: CreditAccountProps

  private constructor(props: CreditAccountProps) {
    this.props = props
  }

  static create(id: string, orgId: string): CreditAccount {
    return new CreditAccount({
      id,
      orgId,
      balance: Balance.zero(),
      lowBalanceThreshold: Balance.fromString('100'),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): CreditAccount {
    return new CreditAccount({
      id: row.id as string,
      orgId: row.org_id as string,
      balance: Balance.fromString(row.balance as string),
      lowBalanceThreshold: Balance.fromString(row.low_balance_threshold as string),
      status: row.status as 'active' | 'frozen',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  applyTopUp(amount: string): CreditAccount {
    const newBalance = this.props.balance.add(amount)
    return new CreditAccount({
      ...this.props,
      balance: newBalance,
      updatedAt: new Date(),
    })
  }

  applyDeduction(amount: string): CreditAccount {
    const newBalance = this.props.balance.subtract(amount)
    return new CreditAccount({
      ...this.props,
      balance: newBalance,
      updatedAt: new Date(),
    })
  }

  isBalanceLow(): boolean {
    return this.props.balance.isLessThanOrEqual(this.props.lowBalanceThreshold.toString())
  }

  isBalanceDepleted(): boolean {
    return this.props.balance.isNegativeOrZero()
  }

  get id(): string {
    return this.props.id
  }
  get orgId(): string {
    return this.props.orgId
  }
  get balance(): string {
    return this.props.balance.toString()
  }
  get lowBalanceThreshold(): string {
    return this.props.lowBalanceThreshold.toString()
  }
  get status(): string {
    return this.props.status
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      org_id: this.props.orgId,
      balance: this.props.balance.toString(),
      low_balance_threshold: this.props.lowBalanceThreshold.toString(),
      status: this.props.status,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
    }
  }
}
