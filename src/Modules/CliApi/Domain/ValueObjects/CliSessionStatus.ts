// src/Modules/CliApi/Domain/ValueObjects/CliSessionStatus.ts
export const CliSessionStatusValues = ['active', 'revoked', 'expired'] as const
export type CliSessionStatusType = (typeof CliSessionStatusValues)[number]

export class CliSessionStatus {
  private constructor(private readonly value: CliSessionStatusType) {}

  static active(): CliSessionStatus {
    return new CliSessionStatus('active')
  }

  static revoked(): CliSessionStatus {
    return new CliSessionStatus('revoked')
  }

  static expired(): CliSessionStatus {
    return new CliSessionStatus('expired')
  }

  static from(value: string): CliSessionStatus {
    if (!CliSessionStatusValues.includes(value as CliSessionStatusType)) {
      throw new Error(`無效的 CLI Session 狀態: ${value}`)
    }
    return new CliSessionStatus(value as CliSessionStatusType)
  }

  isActive(): boolean {
    return this.value === 'active'
  }

  isRevoked(): boolean {
    return this.value === 'revoked'
  }

  getValue(): CliSessionStatusType {
    return this.value
  }
}
