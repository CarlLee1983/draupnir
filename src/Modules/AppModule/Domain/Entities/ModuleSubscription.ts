// src/Modules/AppModule/Domain/Entities/ModuleSubscription.ts
import { SubscriptionStatus } from '../ValueObjects/SubscriptionStatus'

interface ModuleSubscriptionProps {
  readonly id: string
  readonly orgId: string
  readonly moduleId: string
  readonly status: SubscriptionStatus
  readonly subscribedAt: Date
  readonly updatedAt: Date
}

export class ModuleSubscription {
  private readonly props: ModuleSubscriptionProps

  private constructor(props: ModuleSubscriptionProps) {
    this.props = props
  }

  static create(orgId: string, moduleId: string, id?: string): ModuleSubscription {
    return new ModuleSubscription({
      id: id ?? crypto.randomUUID(),
      orgId,
      moduleId,
      status: SubscriptionStatus.active(),
      subscribedAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): ModuleSubscription {
    return new ModuleSubscription({
      id: row.id as string,
      orgId: row.org_id as string,
      moduleId: row.module_id as string,
      status: SubscriptionStatus.fromString(row.status as string),
      subscribedAt: new Date(row.subscribed_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  suspend(): ModuleSubscription {
    return new ModuleSubscription({
      ...this.props,
      status: this.props.status.transitionTo(SubscriptionStatus.suspended()),
      updatedAt: new Date(),
    })
  }

  reactivate(): ModuleSubscription {
    return new ModuleSubscription({
      ...this.props,
      status: this.props.status.transitionTo(SubscriptionStatus.active()),
      updatedAt: new Date(),
    })
  }

  cancel(): ModuleSubscription {
    return new ModuleSubscription({
      ...this.props,
      status: this.props.status.transitionTo(SubscriptionStatus.cancelled()),
      updatedAt: new Date(),
    })
  }

  get id(): string { return this.props.id }
  get orgId(): string { return this.props.orgId }
  get moduleId(): string { return this.props.moduleId }
  get status(): string { return this.props.status.toString() }
  get subscribedAt(): Date { return this.props.subscribedAt }
  get updatedAt(): Date { return this.props.updatedAt }

  isActive(): boolean { return this.props.status.isActive() }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      org_id: this.props.orgId,
      module_id: this.props.moduleId,
      status: this.props.status.toString(),
      subscribed_at: this.props.subscribedAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
    }
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.props.id,
      orgId: this.props.orgId,
      moduleId: this.props.moduleId,
      status: this.props.status.toString(),
      subscribedAt: this.props.subscribedAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    }
  }
}
