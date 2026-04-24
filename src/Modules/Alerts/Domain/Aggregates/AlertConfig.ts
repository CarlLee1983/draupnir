import { BudgetAmount } from '../ValueObjects/BudgetAmount'

/**
 * Represents the severity level of an alert.
 * 'warning' typically means a threshold is approached.
 * 'critical' typically means a threshold is exceeded.
 */
export type AlertTier = 'warning' | 'critical'

/**
 * Internal properties for the AlertConfig aggregate.
 */
interface AlertConfigProps {
  /** Unique identifier for the alert configuration. */
  readonly id: string
  /** Organization ID this configuration belongs to. */
  readonly orgId: string
  /** The monthly budget amount in USD. */
  readonly budgetUsd: string
  /** The most recent alert tier that was triggered. */
  readonly lastAlertedTier: AlertTier | null
  /** The ISO timestamp when the last alert was sent. */
  readonly lastAlertedAt: string | null
  /** The month key (YYYY-MM) for which the last alert was sent. */
  readonly lastAlertedMonth: string | null
  /** The ISO timestamp when this configuration was created. */
  readonly createdAt: string
  /** The ISO timestamp when this configuration was last updated. */
  readonly updatedAt: string
}

/**
 * Immutable alert budget configuration per organization.
 *
 * Responsibilities:
 * - Define monthly budget for an organization.
 * - Track alert history (tier and month) to prevent duplicate alerts.
 * - Determine if an alert needs to be sent or escalated based on current usage.
 */
export class AlertConfig {
  /** Internal state of the alert configuration. */
  private readonly props: AlertConfigProps

  /**
   * Internal constructor for the AlertConfig aggregate.
   * Use static factory methods like `create` or `fromDatabase` instead.
   *
   * @param props The initial properties for the configuration.
   */
  private constructor(props: AlertConfigProps) {
    this.props = props
  }

  /**
   * Creates a brand new AlertConfig for an organization.
   *
   * @param id Unique identifier for the configuration.
   * @param orgId Organization ID this configuration belongs to.
   * @param budgetUsd The monthly budget amount in USD.
   * @returns A new AlertConfig instance.
   */
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

  /**
   * Reconstitutes an AlertConfig instance from database row data.
   *
   * @param row The raw database record.
   * @returns A reconstituted AlertConfig instance.
   */
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

  /**
   * Returns a new AlertConfig with an updated budget (immutable pattern).
   *
   * @param newBudgetUsd The new monthly budget amount in USD.
   * @returns A new AlertConfig instance with the updated budget.
   */
  updateBudget(newBudgetUsd: string): AlertConfig {
    const amount = BudgetAmount.create(newBudgetUsd)

    return new AlertConfig({
      ...this.props,
      budgetUsd: amount.value,
      updatedAt: new Date().toISOString(),
    })
  }

  /**
   * Marks that an alert has been sent for a specific tier and month (immutable pattern).
   *
   * @param tier The alert tier that was triggered.
   * @param month The month key (YYYY-MM) the alert applies to.
   * @returns A new AlertConfig instance with updated alert history.
   */
  markAlerted(tier: AlertTier, month: string): AlertConfig {
    return new AlertConfig({
      ...this.props,
      lastAlertedTier: tier,
      lastAlertedAt: new Date().toISOString(),
      lastAlertedMonth: month,
      updatedAt: new Date().toISOString(),
    })
  }

  /**
   * Checks if an alert should be sent for the given month.
   * Returns true if no alerts have been sent for this month yet.
   *
   * @param currentMonth The current month key (YYYY-MM).
   * @returns True if an alert is needed.
   */
  needsAlert(currentMonth: string): boolean {
    if (this.props.lastAlertedMonth !== currentMonth) {
      return true
    }

    return this.props.lastAlertedTier === null
  }

  /**
   * Checks if an alert can be escalated to a higher tier for the given month.
   *
   * @param tier The new tier to evaluate escalation for.
   * @param currentMonth The current month key (YYYY-MM).
   * @returns True if the alert can be escalated.
   */
  canEscalate(tier: AlertTier, currentMonth: string): boolean {
    if (this.props.lastAlertedMonth !== currentMonth) {
      return true
    }

    if (this.props.lastAlertedTier === null) {
      return true
    }

    return this.props.lastAlertedTier === 'warning' && tier === 'critical'
  }

  /** Gets the unique identifier of the configuration. */
  get id(): string {
    return this.props.id
  }

  /** Gets the organization ID this configuration belongs to. */
  get orgId(): string {
    return this.props.orgId
  }

  /** Gets the monthly budget amount in USD. */
  get budgetUsd(): string {
    return this.props.budgetUsd
  }

  /** Gets the most recent alert tier that was triggered. */
  get lastAlertedTier(): AlertTier | null {
    return this.props.lastAlertedTier
  }

  /** Gets the ISO timestamp when the last alert was sent. */
  get lastAlertedAt(): string | null {
    return this.props.lastAlertedAt
  }

  /** Gets the month key (YYYY-MM) for which the last alert was sent. */
  get lastAlertedMonth(): string | null {
    return this.props.lastAlertedMonth
  }

  /** Gets the ISO timestamp when this configuration was created. */
  get createdAt(): string {
    return this.props.createdAt
  }

  /** Gets the ISO timestamp when this configuration was last updated. */
  get updatedAt(): string {
    return this.props.updatedAt
  }

  /**
   * Normalizes a potentially empty value to a nullable string.
   *
   * @param value The value to normalize.
   * @returns The normalized string or null.
   */
  private static normalizeNullableString(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null
    }

    return String(value)
  }

  /**
   * Normalizes a raw value to a valid AlertTier or null.
   *
   * @param value The value to normalize.
   * @returns The normalized AlertTier or null.
   */
  private static normalizeTier(value: unknown): AlertTier | null {
    if (value === 'warning' || value === 'critical') {
      return value
    }

    return null
  }
}
