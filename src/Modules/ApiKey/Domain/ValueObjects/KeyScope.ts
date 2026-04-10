export interface KeyScopeProps {
  allowedModels?: readonly string[] | null
  rateLimitRpm?: number | null
  rateLimitTpm?: number | null
}

export interface KeyScopeJSON {
  allowed_models: readonly string[] | null
  rate_limit_rpm: number | null
  rate_limit_tpm: number | null
}

export class KeyScope {
  private constructor(
    private readonly allowedModels: readonly string[] | null,
    private readonly rateLimitRpm: number | null,
    private readonly rateLimitTpm: number | null,
  ) {}

  static unrestricted(): KeyScope {
    return new KeyScope(null, null, null)
  }

  static create(props: KeyScopeProps): KeyScope {
    const models =
      props.allowedModels && props.allowedModels.length > 0 ? props.allowedModels : null

    if (props.rateLimitRpm != null && props.rateLimitRpm < 0) {
      throw new Error('RPM 限制不能為負數')
    }
    if (props.rateLimitTpm != null && props.rateLimitTpm < 0) {
      throw new Error('TPM 限制不能為負數')
    }

    return new KeyScope(models, props.rateLimitRpm ?? null, props.rateLimitTpm ?? null)
  }

  static fromJSON(json: KeyScopeJSON): KeyScope {
    return new KeyScope(json.allowed_models, json.rate_limit_rpm, json.rate_limit_tpm)
  }

  getAllowedModels(): readonly string[] | null {
    return this.allowedModels
  }

  getRateLimitRpm(): number | null {
    return this.rateLimitRpm
  }

  getRateLimitTpm(): number | null {
    return this.rateLimitTpm
  }

  toJSON(): KeyScopeJSON {
    return {
      allowed_models: this.allowedModels,
      rate_limit_rpm: this.rateLimitRpm,
      rate_limit_tpm: this.rateLimitTpm,
    }
  }

  equals(other: unknown): boolean {
    if (!(other instanceof KeyScope)) return false
    if (this.rateLimitRpm !== other.rateLimitRpm) return false
    if (this.rateLimitTpm !== other.rateLimitTpm) return false
    if (this.allowedModels === null && other.allowedModels === null) return true
    if (this.allowedModels === null || other.allowedModels === null) return false
    if (this.allowedModels.length !== other.allowedModels.length) return false
    return this.allowedModels.every((m, i) => m === other.allowedModels![i])
  }
}
