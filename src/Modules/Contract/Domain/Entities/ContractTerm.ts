// src/Modules/Contract/Domain/Entities/ContractTerm.ts

/** API throughput caps expressed as requests and tokens per minute. */
export interface RateLimit {
  readonly rpm: number
  readonly tpm: number
}

/** Serializable commercial terms attached to a contract (quota, modules, limits, validity). */
export interface ContractTermProps {
  readonly creditQuota: number
  readonly allowedModules: readonly string[]
  readonly rateLimit: RateLimit
  readonly validityPeriod: {
    readonly startDate: string
    readonly endDate: string
  }
}

/** Entity describing what a contract grants: credits, allowed modules, rate limits, and validity window. */
export class ContractTerm {
  private readonly props: ContractTermProps

  private constructor(props: ContractTermProps) {
    this.props = props
  }

  /** Validates invariants and wraps props in a term instance. */
  static create(props: ContractTermProps): ContractTerm {
    if (props.creditQuota < 0) {
      throw new Error('Credit quota cannot be negative')
    }
    if (props.rateLimit.rpm < 0 || props.rateLimit.tpm < 0) {
      throw new Error('Rate limits cannot be negative')
    }
    if (!props.allowedModules || props.allowedModules.length === 0) {
      throw new Error('Allowed modules list cannot be empty')
    }
    return new ContractTerm(props)
  }

  /** Builds a term from loosely typed JSON (e.g. parsed DB payload). */
  static fromJSON(json: Record<string, unknown>): ContractTerm {
    return ContractTerm.create({
      creditQuota: json.creditQuota as number,
      allowedModules: json.allowedModules as string[],
      rateLimit: json.rateLimit as RateLimit,
      validityPeriod: json.validityPeriod as { startDate: string; endDate: string },
    })
  }

  get creditQuota(): number {
    return this.props.creditQuota
  }

  get allowedModules(): readonly string[] {
    return this.props.allowedModules
  }

  get rateLimit(): RateLimit {
    return this.props.rateLimit
  }

  get validityPeriod(): { readonly startDate: string; readonly endDate: string } {
    return this.props.validityPeriod
  }

  /** True when `moduleName` appears in the allowed modules list. */
  hasModule(moduleName: string): boolean {
    return this.props.allowedModules.includes(moduleName)
  }

  /** Returns a deep-copied plain object suitable for persistence or API payloads. */
  toJSON(): ContractTermProps {
    return {
      creditQuota: this.props.creditQuota,
      allowedModules: [...this.props.allowedModules],
      rateLimit: { ...this.props.rateLimit },
      validityPeriod: { ...this.props.validityPeriod },
    }
  }
}
