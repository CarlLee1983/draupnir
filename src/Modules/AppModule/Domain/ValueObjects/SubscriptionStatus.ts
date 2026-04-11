// src/Modules/AppModule/Domain/ValueObjects/SubscriptionStatus.ts
import { ValueObject } from '@/Shared/Domain/ValueObject'

export type SubscriptionStatusValue = 'active' | 'suspended' | 'cancelled'

const VALID_TRANSITIONS: Record<SubscriptionStatusValue, SubscriptionStatusValue[]> = {
  active: ['suspended', 'cancelled'],
  suspended: ['active', 'cancelled'],
  cancelled: [],
}

export class SubscriptionStatus extends ValueObject {
  private constructor(private readonly value: SubscriptionStatusValue) {
    super()
  }

  static active(): SubscriptionStatus {
    return new SubscriptionStatus('active')
  }

  static suspended(): SubscriptionStatus {
    return new SubscriptionStatus('suspended')
  }

  static cancelled(): SubscriptionStatus {
    return new SubscriptionStatus('cancelled')
  }

  static fromString(value: string): SubscriptionStatus {
    const valid: SubscriptionStatusValue[] = ['active', 'suspended', 'cancelled']
    if (!valid.includes(value as SubscriptionStatusValue)) {
      throw new Error(`Invalid subscription status: ${value}`)
    }
    return new SubscriptionStatus(value as SubscriptionStatusValue)
  }

  canTransitionTo(target: SubscriptionStatus): boolean {
    return VALID_TRANSITIONS[this.value].includes(target.value)
  }

  transitionTo(target: SubscriptionStatus): SubscriptionStatus {
    if (!this.canTransitionTo(target)) {
      throw new Error(`Cannot transition from ${this.value} to ${target.value}`)
    }
    return target
  }

  isActive(): boolean {
    return this.value === 'active'
  }
  isSuspended(): boolean {
    return this.value === 'suspended'
  }
  isCancelled(): boolean {
    return this.value === 'cancelled'
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof SubscriptionStatus)) return false
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
