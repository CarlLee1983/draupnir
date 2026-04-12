export type AlertEventTier = 'warning' | 'critical'

interface AlertEventProps {
  readonly id: string
  readonly orgId: string
  readonly tier: AlertEventTier
  readonly budgetUsd: string
  readonly actualCostUsd: string
  readonly percentage: string
  readonly month: string
  readonly recipients: readonly string[]
  readonly createdAt: string
}

export interface CreateAlertEventParams {
  readonly orgId: string
  readonly tier: AlertEventTier
  readonly budgetUsd: string
  readonly actualCostUsd: string
  readonly percentage: string
  readonly month: string
  readonly recipients: readonly string[]
}

/**
 * Immutable audit entity for a fired alert.
 */
export class AlertEvent {
  private readonly props: AlertEventProps

  private constructor(props: AlertEventProps) {
    this.props = props
  }

  static create(params: CreateAlertEventParams): AlertEvent {
    return new AlertEvent({
      id: crypto.randomUUID(),
      orgId: params.orgId,
      tier: params.tier,
      budgetUsd: params.budgetUsd,
      actualCostUsd: params.actualCostUsd,
      percentage: params.percentage,
      month: params.month,
      recipients: [...params.recipients],
      createdAt: new Date().toISOString(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): AlertEvent {
    return new AlertEvent({
      id: String(row.id),
      orgId: String(row.org_id),
      tier: String(row.tier) as AlertEventTier,
      budgetUsd: String(row.budget_usd),
      actualCostUsd: String(row.actual_cost_usd),
      percentage: String(row.percentage),
      month: String(row.month),
      recipients: AlertEvent.parseRecipients(row.recipients),
      createdAt: String(row.created_at),
    })
  }

  toInsert(): Record<string, unknown> {
    return {
      id: this.props.id,
      org_id: this.props.orgId,
      tier: this.props.tier,
      budget_usd: this.props.budgetUsd,
      actual_cost_usd: this.props.actualCostUsd,
      percentage: this.props.percentage,
      month: this.props.month,
      recipients: JSON.stringify(this.props.recipients),
      created_at: this.props.createdAt,
    }
  }

  get id(): string {
    return this.props.id
  }

  get orgId(): string {
    return this.props.orgId
  }

  get tier(): AlertEventTier {
    return this.props.tier
  }

  get budgetUsd(): string {
    return this.props.budgetUsd
  }

  get actualCostUsd(): string {
    return this.props.actualCostUsd
  }

  get percentage(): string {
    return this.props.percentage
  }

  get month(): string {
    return this.props.month
  }

  get recipients(): readonly string[] {
    return this.props.recipients
  }

  get createdAt(): string {
    return this.props.createdAt
  }

  private static parseRecipients(value: unknown): readonly string[] {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry))
    }

    if (typeof value !== 'string' || value.trim().length === 0) {
      return []
    }

    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry))
      }
    } catch {
      return []
    }

    return []
  }
}
