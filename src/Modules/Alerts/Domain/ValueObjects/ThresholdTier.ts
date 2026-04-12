export type ThresholdTierValue = 'warning' | 'critical'

/**
 * Fixed threshold tier value object.
 */
export class ThresholdTier {
  static readonly WARNING = new ThresholdTier('warning', 80)
  static readonly CRITICAL = new ThresholdTier('critical', 100)

  private constructor(
    private readonly tierValue: ThresholdTierValue,
    private readonly tierPercentage: number,
  ) {}

  static fromPercentage(pct: number): ThresholdTier | null {
    if (!Number.isFinite(pct)) {
      return null
    }

    if (pct >= 100) {
      return ThresholdTier.CRITICAL
    }

    if (pct >= 80) {
      return ThresholdTier.WARNING
    }

    return null
  }

  static fromValue(value: string): ThresholdTier | null {
    if (value === ThresholdTier.WARNING.value) {
      return ThresholdTier.WARNING
    }

    if (value === ThresholdTier.CRITICAL.value) {
      return ThresholdTier.CRITICAL
    }

    return null
  }

  get value(): ThresholdTierValue {
    return this.tierValue
  }

  get percentage(): number {
    return this.tierPercentage
  }

  isHigherThan(other: ThresholdTier): boolean {
    return this.tierPercentage > other.tierPercentage
  }
}
