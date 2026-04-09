// src/Modules/Contract/Domain/ValueObjects/ContractId.ts
import { ValueObject } from '@/Shared/Domain/ValueObject'

export class ContractId extends ValueObject {
  private constructor(private readonly value: string) {
    super()
  }

  static create(id?: string): ContractId {
    return new ContractId(id ?? crypto.randomUUID())
  }

  static fromString(id: string): ContractId {
    if (!id || id.trim().length === 0) {
      throw new Error('ContractId 不可為空')
    }
    return new ContractId(id)
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof ContractId)) return false
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
