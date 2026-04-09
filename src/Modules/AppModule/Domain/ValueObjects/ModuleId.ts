// src/Modules/AppModule/Domain/ValueObjects/ModuleId.ts
import { ValueObject } from '@/Shared/Domain/ValueObject'

export class ModuleId extends ValueObject {
  private constructor(private readonly value: string) {
    super()
  }

  static create(id?: string): ModuleId {
    return new ModuleId(id ?? crypto.randomUUID())
  }

  static fromString(id: string): ModuleId {
    if (!id || id.trim().length === 0) {
      throw new Error('ModuleId 不可為空')
    }
    return new ModuleId(id)
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof ModuleId)) return false
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
