// src/Modules/Contract/Domain/ValueObjects/ContractStatus.ts
import { ValueObject } from '@/Shared/Domain/ValueObject'

export type ContractStatusValue = 'draft' | 'active' | 'expired' | 'terminated'

const VALID_TRANSITIONS: Record<ContractStatusValue, ContractStatusValue[]> = {
  draft: ['active'],
  active: ['expired', 'terminated'],
  expired: [],
  terminated: [],
}

export class ContractStatus extends ValueObject {
  private constructor(private readonly value: ContractStatusValue) {
    super()
  }

  static draft(): ContractStatus {
    return new ContractStatus('draft')
  }

  static active(): ContractStatus {
    return new ContractStatus('active')
  }

  static expired(): ContractStatus {
    return new ContractStatus('expired')
  }

  static terminated(): ContractStatus {
    return new ContractStatus('terminated')
  }

  static fromString(value: string): ContractStatus {
    const valid: ContractStatusValue[] = ['draft', 'active', 'expired', 'terminated']
    if (!valid.includes(value as ContractStatusValue)) {
      throw new Error(`Invalid contract status: ${value}`)
    }
    return new ContractStatus(value as ContractStatusValue)
  }

  canTransitionTo(target: ContractStatus): boolean {
    return VALID_TRANSITIONS[this.value].includes(target.value)
  }

  transitionTo(target: ContractStatus): ContractStatus {
    if (!this.canTransitionTo(target)) {
      throw new Error(`Cannot transition from ${this.value} to ${target.value}`)
    }
    return target
  }

  isDraft(): boolean {
    return this.value === 'draft'
  }
  isActive(): boolean {
    return this.value === 'active'
  }
  isExpired(): boolean {
    return this.value === 'expired'
  }
  isTerminated(): boolean {
    return this.value === 'terminated'
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof ContractStatus)) return false
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
