// src/Modules/Credit/Domain/ValueObjects/Balance.ts

/**
 * Balance Value Object
 *
 * 使用整數運算避免浮點誤差。
 * 內部以 bigint 儲存（乘以 10^PRECISION），對外以字串表示。
 */
/**
 * Balance Value Object
 * Handles high-precision monetary calculations using BigInt to avoid floating point errors.
 */
const PRECISION = 10
const SCALE = BigInt(10 ** PRECISION)

export class Balance {
  private constructor(private readonly value: bigint) {}

  /** Returns a zero balance. */
  static zero(): Balance {
    return new Balance(0n)
  }

  /**
   * Creates a Balance from a decimal string.
   * @param s - Decimal string (e.g., "10.00").
   */
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

  /** Adds an amount to the current balance. */
  add(amount: string): Balance {
    return new Balance(this.value + Balance.fromString(amount).value)
  }

  /** Subtracts an amount from the current balance. */
  subtract(amount: string): Balance {
    return new Balance(this.value - Balance.fromString(amount).value)
  }

  /** Checks if balance is less than or equal to a target amount. */
  isLessThanOrEqual(other: string): boolean {
    return this.value <= Balance.fromString(other).value
  }

  /** Checks if balance is zero or negative. */
  isNegativeOrZero(): boolean {
    return this.value <= 0n
  }

  /**
   * Creates a Balance from a string, asserting it is positive.
   * @throws Error if the amount is zero or negative.
   */
  static fromPositiveAmount(value: string): Balance {
    const balance = Balance.fromString(value)
    if (balance.isNegativeOrZero()) {
      throw new Error('Amount must be positive')
    }
    return balance
  }

  /** Returns the decimal string representation. */
  toString(): string {
    const sign = this.value < 0n ? '-' : ''
    const abs = this.value < 0n ? -this.value : this.value
    const intPart = abs / SCALE
    const decPart = abs % SCALE
    if (decPart === 0n) return `${sign}${intPart}`
    const decStr = decPart.toString().padStart(PRECISION, '0').replace(/0+$/, '')
    return `${sign}${intPart}.${decStr}`
  }

  /** Gets the raw BigInt value. */
  toBigInt(): bigint {
    return this.value
  }
}

