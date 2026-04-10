import { ValueObject } from '@/Shared/Domain/ValueObject'

export type OrgStatusType = 'active' | 'suspended'

const VALID_STATUSES: readonly string[] = ['active', 'suspended']

export class OrgStatus extends ValueObject {
  private readonly value: OrgStatusType

  private constructor(value: OrgStatusType) {
    super()
    this.value = value
  }

  static from(value: string): OrgStatus {
    if (!VALID_STATUSES.includes(value)) {
      throw new Error(`Invalid organization status: ${value}. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }
    return new OrgStatus(value as OrgStatusType)
  }

  static active(): OrgStatus {
    return new OrgStatus('active')
  }

  static suspended(): OrgStatus {
    return new OrgStatus('suspended')
  }

  isActive(): boolean {
    return this.value === 'active'
  }

  isSuspended(): boolean {
    return this.value === 'suspended'
  }

  equals(other: ValueObject): boolean {
    return other instanceof OrgStatus && other.value === this.value
  }

  toString(): string {
    return this.value
  }
}
