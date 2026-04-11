// src/Modules/Contract/Domain/ValueObjects/ContractTarget.ts
import { ValueObject } from '@/Shared/Domain/ValueObject'

export type ContractTargetType = 'organization' | 'user'

export class ContractTarget extends ValueObject {
  private constructor(
    private readonly type: ContractTargetType,
    private readonly id: string,
  ) {
    super()
  }

  static forOrganization(orgId: string): ContractTarget {
    if (!orgId || orgId.trim().length === 0) {
      throw new Error('Organization ID cannot be empty')
    }
    return new ContractTarget('organization', orgId)
  }

  static forUser(userId: string): ContractTarget {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID cannot be empty')
    }
    return new ContractTarget('user', userId)
  }

  static create(type: string, id: string): ContractTarget {
    if (type === 'organization') return ContractTarget.forOrganization(id)
    if (type === 'user') return ContractTarget.forUser(id)
    throw new Error(`Invalid contract target type: ${type}`)
  }

  getType(): ContractTargetType {
    return this.type
  }

  getId(): string {
    return this.id
  }

  isOrganization(): boolean {
    return this.type === 'organization'
  }

  isUser(): boolean {
    return this.type === 'user'
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof ContractTarget)) return false
    return this.type === other.type && this.id === other.id
  }

  toString(): string {
    return `${this.type}:${this.id}`
  }

  toJSON(): { type: ContractTargetType; id: string } {
    return { type: this.type, id: this.id }
  }
}
