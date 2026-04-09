// src/Modules/Credit/Domain/ValueObjects/Balance.ts

/**
 * Balance Value Object
 *
 * 使用整數運算避免浮點誤差。
 * 內部以 bigint 儲存（乘以 10^PRECISION），對外以字串表示。
 */
const PRECISION = 10
const SCALE = BigInt(10 ** PRECISION)

export class Balance {
  private constructor(private readonly value: bigint) {}

  static zero(): Balance {
    return new Balance(0n)
  }

  static fromString(s: string): Balance {
    const cleaned = s.trim()
    if (cleaned === '0' || cleaned === '') return new Balance(0n)

    const [intPart, decPart = ''] = cleaned.split('.')
    const sign = intPart.startsWith('-') ? -1n : 1n
    const absInt = intPart.replace('-', '')
    const paddedDec = decPart.padEnd(PRECISION, '0').slice(0, PRECISION)
    const raw = BigInt(absInt) * SCALE + BigInt(paddedDec)
    return new Balance(sign * raw)
  }

  add(amount: string): Balance {
    return new Balance(this.value + Balance.fromString(amount).value)
  }

  subtract(amount: string): Balance {
    return new Balance(this.value - Balance.fromString(amount).value)
  }

  isLessThanOrEqual(other: string): boolean {
    return this.value <= Balance.fromString(other).value
  }

  isNegativeOrZero(): boolean {
    return this.value <= 0n
  }

  toString(): string {
    const sign = this.value < 0n ? '-' : ''
    const abs = this.value < 0n ? -this.value : this.value
    const intPart = abs / SCALE
    const decPart = abs % SCALE
    if (decPart === 0n) return `${sign}${intPart}`
    const decStr = decPart.toString().padStart(PRECISION, '0').replace(/0+$/, '')
    return `${sign}${intPart}.${decStr}`
  }

  toBigInt(): bigint {
    return this.value
  }
}
