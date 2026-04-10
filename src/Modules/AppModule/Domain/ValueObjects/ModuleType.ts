// src/Modules/AppModule/Domain/ValueObjects/ModuleType.ts
import { ValueObject } from '@/Shared/Domain/ValueObject'

export type ModuleTypeValue = 'free' | 'paid'

export class ModuleType extends ValueObject {
  private constructor(private readonly value: ModuleTypeValue) {
    super()
  }

  static free(): ModuleType {
    return new ModuleType('free')
  }

  static paid(): ModuleType {
    return new ModuleType('paid')
  }

  static fromString(value: string): ModuleType {
    if (value !== 'free' && value !== 'paid') {
      throw new Error(`無效的模組類型: ${value}`)
    }
    return new ModuleType(value)
  }

  isFree(): boolean {
    return this.value === 'free'
  }
  isPaid(): boolean {
    return this.value === 'paid'
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof ModuleType)) return false
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
