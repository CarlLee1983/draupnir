// src/Modules/Credit/Domain/Aggregates/CreditAccount.ts
import { Balance } from '../ValueObjects/Balance'
import { CreditDeductedEvent } from '../Events/CreditDeductedEvent'
import { CreditToppedUpEvent } from '../Events/CreditToppedUpEvent'
import { LowBalanceAlertEvent } from '../Events/LowBalanceAlertEvent'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'

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
  private readonly domainEvents: DomainEvent[] = []

  private constructor(props: CreditAccountProps, events: DomainEvent[] = []) {
    this.props = props
    this.domainEvents = events
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
    }, [])
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
    }, [])
  }

  applyTopUp(
    amount: string,
    source: 'purchase' | 'manual_topup' | 'promotion' | 'refund' = 'purchase',
  ): CreditAccount {
    const newBalance = this.props.balance.add(amount)
    const updatedAt = new Date()
    const newAccount = new CreditAccount({
      ...this.props,
      balance: newBalance,
      updatedAt,
    }, [...this.domainEvents])

    // 發佈充值事件
    newAccount.addDomainEvent(
      new CreditToppedUpEvent(
        this.props.id,
        this.props.orgId,
        amount,
        newBalance.toString(),
        source,
      ),
    )

    return newAccount
  }

  applyDeduction(
    amount: string,
    reason: 'api_call' | 'manual_deduction' | 'refund_reversal' = 'api_call',
  ): CreditAccount {
    const newBalance = this.props.balance.subtract(amount)
    const updatedAt = new Date()
    const newAccount = new CreditAccount({
      ...this.props,
      balance: newBalance,
      updatedAt,
    }, [...this.domainEvents])

    // 發佈扣除事件
    newAccount.addDomainEvent(
      new CreditDeductedEvent(
        this.props.id,
        this.props.orgId,
        amount,
        newBalance.toString(),
        reason,
      ),
    )

    // 若低於閾值，發佈低額度警告
    if (newBalance.isLessThanOrEqual(this.props.lowBalanceThreshold.toString())) {
      const percentage =
        newBalance.toString() === '0'
          ? 0
          : Math.round(
              (parseFloat(newBalance.toString()) /
                parseFloat(this.props.lowBalanceThreshold.toString())) *
                100,
            )
      newAccount.addDomainEvent(
        new LowBalanceAlertEvent(
          this.props.id,
          this.props.orgId,
          newBalance.toString(),
          this.props.lowBalanceThreshold.toString(),
          percentage,
        ),
      )
    }

    return newAccount
  }

  private addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event)
  }

  getDomainEvents(): DomainEvent[] {
    return [...this.domainEvents]
  }

  clearDomainEvents(): void {
    this.domainEvents.length = 0
  }

  isBalanceLow(): boolean {
    return this.props.balance.isLessThanOrEqual(this.props.lowBalanceThreshold.toString())
  }

  isBalanceDepleted(): boolean {
    return this.props.balance.isNegativeOrZero()
  }

  get id(): string { return this.props.id }
  get orgId(): string { return this.props.orgId }
  get balance(): string { return this.props.balance.toString() }
  get lowBalanceThreshold(): string { return this.props.lowBalanceThreshold.toString() }
  get status(): string { return this.props.status }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

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
