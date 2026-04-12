import Decimal from 'decimal.js'

const INVALID_AMOUNT_MESSAGE = 'BudgetAmount must be a positive decimal string'

/**
 * Positive dollar amount value object backed by Decimal.js.
 */
export class BudgetAmount {
  private readonly amount: Decimal
  private readonly rawValue: string

  constructor(value: string) {
    const normalized = value.trim()

    let parsed: Decimal
    try {
      parsed = new Decimal(normalized)
    } catch {
      throw new Error(INVALID_AMOUNT_MESSAGE)
    }

    if (!parsed.isFinite() || parsed.lte(0)) {
      throw new Error(INVALID_AMOUNT_MESSAGE)
    }

    this.amount = parsed
    this.rawValue = normalized
  }

  static create(value: string): BudgetAmount {
    return new BudgetAmount(value)
  }

  get value(): string {
    return this.rawValue
  }

  get decimal(): Decimal {
    return this.amount
  }

  percentageOf(cost: Decimal): number {
    return cost.div(this.amount).times(100).toNumber()
  }
}
