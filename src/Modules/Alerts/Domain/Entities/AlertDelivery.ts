import type { DeliveryChannel, DeliveryStatus } from '../ValueObjects/DeliveryStatus'

export interface AlertDeliveryProps {
  readonly id: string
  readonly alertEventId: string
  readonly channel: DeliveryChannel
  readonly target: string
  readonly targetUrl: string | null
  readonly status: DeliveryStatus
  readonly attempts: number
  readonly statusCode: number | null
  readonly errorMessage: string | null
  readonly dispatchedAt: string
  readonly deliveredAt: string | null
  readonly createdAt: string
  /** Denormalized from parent AlertEvent — required for existsSent / listByOrg single-table queries */
  readonly orgId: string
  /** Denormalized from parent AlertEvent — e.g. '2026-04' */
  readonly month: string
  /** Denormalized from parent AlertEvent — e.g. '50', '75', '100' */
  readonly tier: string
}

export interface CreateAlertDeliveryParams {
  readonly alertEventId: string
  readonly channel: DeliveryChannel
  readonly target: string
  readonly targetUrl: string | null
  readonly dispatchedAt?: string
  /** Denormalized from parent AlertEvent */
  readonly orgId: string
  /** Denormalized from parent AlertEvent */
  readonly month: string
  /** Denormalized from parent AlertEvent */
  readonly tier: string
}

export class AlertDelivery {
  private readonly props: AlertDeliveryProps

  private constructor(props: AlertDeliveryProps) {
    this.props = props
  }

  static create(params: CreateAlertDeliveryParams): AlertDelivery {
    const createdAt = new Date().toISOString()
    const dispatchedAt = params.dispatchedAt ?? createdAt

    return new AlertDelivery({
      id: crypto.randomUUID(),
      alertEventId: params.alertEventId,
      channel: params.channel,
      target: params.target,
      targetUrl: params.targetUrl,
      status: 'pending',
      attempts: 0,
      statusCode: null,
      errorMessage: null,
      dispatchedAt,
      deliveredAt: null,
      createdAt,
      orgId: params.orgId,
      month: params.month,
      tier: params.tier,
    })
  }

  static rehydrate(props: AlertDeliveryProps): AlertDelivery {
    if (!props.orgId) {
      throw new Error(`AlertDelivery.rehydrate: missing orgId (id=${props.id})`)
    }
    if (!props.month) {
      throw new Error(`AlertDelivery.rehydrate: missing month (id=${props.id})`)
    }
    if (!props.tier) {
      throw new Error(`AlertDelivery.rehydrate: missing tier (id=${props.id})`)
    }
    return new AlertDelivery({
      ...props,
      targetUrl: props.targetUrl ?? null,
      statusCode: props.statusCode ?? null,
      errorMessage: props.errorMessage ?? null,
      deliveredAt: props.deliveredAt ?? null,
    })
  }

  markSent(statusCode: number | null, deliveredAt: string, attempts: number): AlertDelivery {
    return new AlertDelivery({
      ...this.props,
      status: 'sent',
      statusCode,
      attempts,
      errorMessage: null,
      deliveredAt,
    })
  }

  markFailed(statusCode: number | null, errorMessage: string, attempts: number): AlertDelivery {
    return new AlertDelivery({
      ...this.props,
      status: 'failed',
      statusCode,
      attempts,
      errorMessage,
      deliveredAt: null,
    })
  }

  get id(): string {
    return this.props.id
  }

  get alertEventId(): string {
    return this.props.alertEventId
  }

  get channel(): DeliveryChannel {
    return this.props.channel
  }

  get target(): string {
    return this.props.target
  }

  get targetUrl(): string | null {
    return this.props.targetUrl
  }

  get status(): DeliveryStatus {
    return this.props.status
  }

  get attempts(): number {
    return this.props.attempts
  }

  get statusCode(): number | null {
    return this.props.statusCode
  }

  get errorMessage(): string | null {
    return this.props.errorMessage
  }

  get dispatchedAt(): string {
    return this.props.dispatchedAt
  }

  get deliveredAt(): string | null {
    return this.props.deliveredAt
  }

  get createdAt(): string {
    return this.props.createdAt
  }

  get orgId(): string {
    return this.props.orgId
  }

  get month(): string {
    return this.props.month
  }

  get tier(): string {
    return this.props.tier
  }
}
