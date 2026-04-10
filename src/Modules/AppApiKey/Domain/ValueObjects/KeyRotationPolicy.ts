export interface KeyRotationPolicyJSON {
  auto_rotate: boolean
  rotation_interval_days: number | null
  grace_period_hours: number
}

export class KeyRotationPolicy {
  private constructor(
    private readonly autoRotate: boolean,
    private readonly rotationIntervalDays: number | null,
    private readonly gracePeriodHours: number,
  ) {}

  static manual(gracePeriodHours = 24): KeyRotationPolicy {
    if (gracePeriodHours < 0) {
      throw new Error('寬限期時數不能為負數')
    }
    return new KeyRotationPolicy(false, null, gracePeriodHours)
  }

  static auto(rotationIntervalDays: number, gracePeriodHours = 24): KeyRotationPolicy {
    if (rotationIntervalDays <= 0) {
      throw new Error('輪換間隔天數必須大於 0')
    }
    if (gracePeriodHours < 0) {
      throw new Error('寬限期時數不能為負數')
    }
    return new KeyRotationPolicy(true, rotationIntervalDays, gracePeriodHours)
  }

  static fromJSON(json: KeyRotationPolicyJSON): KeyRotationPolicy {
    return new KeyRotationPolicy(
      json.auto_rotate,
      json.rotation_interval_days,
      json.grace_period_hours,
    )
  }

  isAutoRotate(): boolean {
    return this.autoRotate
  }

  getRotationIntervalDays(): number | null {
    return this.rotationIntervalDays
  }

  getGracePeriodHours(): number {
    return this.gracePeriodHours
  }

  toJSON(): KeyRotationPolicyJSON {
    return {
      auto_rotate: this.autoRotate,
      rotation_interval_days: this.rotationIntervalDays,
      grace_period_hours: this.gracePeriodHours,
    }
  }

  equals(other: unknown): boolean {
    if (!(other instanceof KeyRotationPolicy)) return false
    return (
      this.autoRotate === other.autoRotate &&
      this.rotationIntervalDays === other.rotationIntervalDays &&
      this.gracePeriodHours === other.gracePeriodHours
    )
  }
}
