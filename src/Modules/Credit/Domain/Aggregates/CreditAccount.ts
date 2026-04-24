import { Balance } from '../ValueObjects/Balance'

/**
 * Internal properties for the CreditAccount aggregate.
 */
interface CreditAccountProps {
  /** Unique identifier for the credit account. */
  readonly id: string
  /** ID of the organization that owns this account. */
  readonly orgId: string
  /** Current credit balance. */
  readonly balance: Balance
  /** Threshold below which an alert should be triggered. */
  readonly lowBalanceThreshold: Balance
  /** Operational status of the account. */
  readonly status: 'active' | 'frozen'
  /** Timestamp when the account was created. */
  readonly createdAt: Date
  /** Timestamp when the account was last updated. */
  readonly updatedAt: Date
}

/**
 * CreditAccount Aggregate Root
 * Manages the credit balance and status for an organization.
 *
 * Responsibilities:
 * - Track the current credit balance.
 * - Enforce balance-related invariants (e.g., low balance detection, depletion).
 * - Manage account status (active, frozen).
 */
export class CreditAccount {
  /** Internal state of the credit account. */
  private readonly props: CreditAccountProps

  /**
   * Internal constructor for the CreditAccount aggregate.
   * Use static factory methods like `create` or `fromDatabase` instead.
   *
   * @param props The initial properties for the aggregate.
   */
  private constructor(props: CreditAccountProps) {
    this.props = props
  }

  /**
   * Creates a brand new CreditAccount for an organization with zero balance.
   *
   * @param id Unique identifier for the account.
   * @param orgId Organization ID.
   * @returns A new CreditAccount instance.
   */
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

  /**
   * Reconstitutes a CreditAccount instance from a database record.
   *
   * @param row The raw database record.
   * @returns A reconstituted CreditAccount instance.
   */
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

  /**
   * Increases the balance by the given amount (immutable pattern).
   *
   * @param amount The string representation of the amount to add.
   * @returns A new CreditAccount instance with the updated balance.
   */
  applyTopUp(amount: string): CreditAccount {
    const newBalance = this.props.balance.add(amount)
    return new CreditAccount({
      ...this.props,
      balance: newBalance,
      updatedAt: new Date(),
    })
  }

  /**
   * Decreases the balance by the given amount (immutable pattern).
   *
   * @param amount The string representation of the amount to subtract.
   * @returns A new CreditAccount instance with the updated balance.
   */
  applyDeduction(amount: string): CreditAccount {
    const newBalance = this.props.balance.subtract(amount)
    return new CreditAccount({
      ...this.props,
      balance: newBalance,
      updatedAt: new Date(),
    })
  }

  /**
   * Checks if the current balance is at or below the low balance threshold.
   *
   * @returns True if the balance is low.
   */
  isBalanceLow(): boolean {
    return this.props.balance.isLessThanOrEqual(this.props.lowBalanceThreshold.toString())
  }

  /**
   * Checks if the current balance is zero or negative.
   *
   * @returns True if the balance is depleted.
   */
  isBalanceDepleted(): boolean {
    return this.props.balance.isNegativeOrZero()
  }

  /** Gets the unique identifier of the account. */
  get id(): string {
    return this.props.id
  }

  /** Gets the ID of the organization that owns this account. */
  get orgId(): string {
    return this.props.orgId
  }

  /** Gets the string representation of the current balance. */
  get balance(): string {
    return this.props.balance.toString()
  }

  /** Gets the string representation of the low balance threshold. */
  get lowBalanceThreshold(): string {
    return this.props.lowBalanceThreshold.toString()
  }

  /** Gets the account status (active/frozen). */
  get status(): string {
    return this.props.status
  }

  /** Gets the timestamp when the account was created. */
  get createdAt(): Date {
    return this.props.createdAt
  }

  /** Gets the timestamp when the account was last updated. */
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  /**
   * Converts the aggregate to a raw database row.
   * 
   * @remarks
   * This method is a deviation from strict DDD patterns (where persistence logic 
   * resides in the Infrastructure layer) to simplify mapping.
   * 
   * @returns A record suitable for database insertion/update.
   */
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
