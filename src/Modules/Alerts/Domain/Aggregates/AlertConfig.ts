import { BudgetAmount } from '../ValueObjects/BudgetAmount'

export type AlertTier = 'warning' | 'critical'

interface AlertConfigProps {
  readonly id: string
  readonly orgId: string
  readonly budgetUsd: string
  readonly lastAlertedTier: AlertTier | null
  readonly lastAlertedAt: string | null
  readonly lastAlertedMonth: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

/**
 * Immutable alert budget configuration per organization.
 */
export class AlertConfig {
  private readonly props: AlertConfigProps

  private constructor(props: AlertConfigProps) {
    this.props = props
  }

  static create(id: string, orgId: string, budgetUsd: string): AlertConfig {
    const amount = BudgetAmount.create(budgetUsd)

    return new AlertConfig({
      id,
      orgId,
      budgetUsd: amount.value,
      lastAlertedTier: null,
      lastAlertedAt: null,
      lastAlertedMonth: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): AlertConfig {
    return new AlertConfig({
      id: String(row.id),
      orgId: String(row.org_id),
      budgetUsd: String(row.budget_usd),
      lastAlertedTier: AlertConfig.normalizeTier(row.last_alerted_tier),
      lastAlertedAt: AlertConfig.normalizeNullableString(row.last_alerted_at),
      lastAlertedMonth: AlertConfig.normalizeNullableString(row.last_alerted_month),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    })
  }

  updateBudget(newBudgetUsd: string): AlertConfig {
    const amount = BudgetAmount.create(newBudgetUsd)

    return new AlertConfig({
      ...this.props,
      budgetUsd: amount.value,
      updatedAt: new Date().toISOString(),
    })
  }

  markAlerted(tier: AlertTier, month: string): AlertConfig {
    return new AlertConfig({
      ...this.props,
      lastAlertedTier: tier,
      lastAlertedAt: new Date().toISOString(),
      lastAlertedMonth: month,
      updatedAt: new Date().toISOString(),
    })
  }

  needsAlert(currentMonth: string): boolean {
    if (this.props.lastAlertedMonth !== currentMonth) {
      return true
    }

    return this.props.lastAlertedTier === null
  }

  canEscalate(tier: AlertTier, currentMonth: string): boolean {
    if (this.props.lastAlertedMonth !== currentMonth) {
      return true
    }

    if (this.props.lastAlertedTier === null) {
      return true
    }

    return this.props.lastAlertedTier === 'warning' && tier === 'critical'
  }

  get id(): string {
    return this.props.id
  }

  get orgId(): string {
    return this.props.orgId
  }

  get budgetUsd(): string {
    return this.props.budgetUsd
  }

  get lastAlertedTier(): AlertTier | null {
    return this.props.lastAlertedTier
  }

  get lastAlertedAt(): string | null {
    return this.props.lastAlertedAt
  }

  get lastAlertedMonth(): string | null {
    return this.props.lastAlertedMonth
  }

  get createdAt(): string {
    return this.props.createdAt
  }

  get updatedAt(): string {
    return this.props.updatedAt
  }

  private static normalizeNullableString(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null
    }

    return String(value)
  }

  private static normalizeTier(value: unknown): AlertTier | null {
    if (value === 'warning' || value === 'critical') {
      return value
    }

    return null
  }
}
