// src/Modules/Contract/Domain/Entities/ContractTerm.ts

export interface RateLimit {
  readonly rpm: number
  readonly tpm: number
}

export interface ContractTermProps {
  readonly creditQuota: number
  readonly allowedModules: readonly string[]
  readonly rateLimit: RateLimit
  readonly validityPeriod: {
    readonly startDate: string
    readonly endDate: string
  }
}

export class ContractTerm {
  private readonly props: ContractTermProps

  private constructor(props: ContractTermProps) {
    this.props = props
  }

  static create(props: ContractTermProps): ContractTerm {
    if (props.creditQuota < 0) {
      throw new Error('信用額度不可為負數')
    }
    if (props.rateLimit.rpm < 0 || props.rateLimit.tpm < 0) {
      throw new Error('速率限制不可為負數')
    }
    if (!props.allowedModules || props.allowedModules.length === 0) {
      throw new Error('允許模組清單不可為空')
    }
    return new ContractTerm(props)
  }

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

  hasModule(moduleName: string): boolean {
    return this.props.allowedModules.includes(moduleName)
  }

  toJSON(): ContractTermProps {
    return {
      creditQuota: this.props.creditQuota,
      allowedModules: [...this.props.allowedModules],
      rateLimit: { ...this.props.rateLimit },
      validityPeriod: { ...this.props.validityPeriod },
    }
  }
}
