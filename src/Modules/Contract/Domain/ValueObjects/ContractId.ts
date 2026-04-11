// src/Modules/Contract/Domain/ValueObjects/ContractId.ts
import { ValueObject } from '@/Shared/Domain/ValueObject'

/** Strongly typed contract identifier (UUID string). */
export class ContractId extends ValueObject {
  private constructor(private readonly value: string) {
    super()
  }

  /** Creates an id, generating a UUID when `id` is omitted. */
  static create(id?: string): ContractId {
    return new ContractId(id ?? crypto.randomUUID())
  }

  /** Parses a non-empty string into a contract id. */
  static fromString(id: string): ContractId {
    if (!id || id.trim().length === 0) {
      throw new Error('ContractId cannot be empty')
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
