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
      throw new Error('RPM limit cannot be negative')
    }
    if (props.rateLimitTpm != null && props.rateLimitTpm < 0) {
      throw new Error('TPM limit cannot be negative')
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
    const a = this.allowedModels
    const b = other.allowedModels
    if (a === null && b === null) return true
    if (a === null || b === null) return false
    if (a.length !== b.length) return false
    return a.every((m, i) => m === b[i])
  }
}
