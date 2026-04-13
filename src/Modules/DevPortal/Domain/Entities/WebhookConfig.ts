import { WebhookEventType } from '../ValueObjects/WebhookEventType'

interface WebhookConfigProps {
  readonly id: string
  readonly applicationId: string
  readonly eventType: WebhookEventType
  readonly enabled: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

interface CreateWebhookConfigParams {
  id: string
  applicationId: string
  eventType: string
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value
  return new Date(value as string)
}

export class WebhookConfig {
  private readonly props: WebhookConfigProps

  private constructor(props: WebhookConfigProps) {
    this.props = props
  }

  static create(params: CreateWebhookConfigParams): WebhookConfig {
    return new WebhookConfig({
      id: params.id,
      applicationId: params.applicationId,
      eventType: WebhookEventType.from(params.eventType),
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): WebhookConfig {
    return new WebhookConfig({
      id: row.id as string,
      applicationId: row.application_id as string,
      eventType: WebhookEventType.from(row.event_type as string),
      enabled: Boolean(row.enabled),
      createdAt: parseDate(row.created_at),
      updatedAt: parseDate(row.updated_at),
    })
  }

  enable(): WebhookConfig {
    return new WebhookConfig({
      ...this.props,
      enabled: true,
      updatedAt: new Date(),
    })
  }

  disable(): WebhookConfig {
    return new WebhookConfig({
      ...this.props,
      enabled: false,
      updatedAt: new Date(),
    })
  }

  get id(): string {
    return this.props.id
  }
  get applicationId(): string {
    return this.props.applicationId
  }
  get eventType(): string {
    return this.props.eventType.getValue()
  }
  get enabled(): boolean {
    return this.props.enabled
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }
}
