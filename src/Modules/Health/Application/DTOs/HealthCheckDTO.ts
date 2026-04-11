import type { HealthCheck } from '../../Domain/Aggregates/HealthCheck'

export interface HealthCheckJSONData {
  id: string
  status: string
  timestamp: string
  checks: {
    database: boolean
    redis?: boolean
    cache?: boolean
  }
  message?: string
}

export class HealthCheckDTO {
  readonly id: string
  readonly status: string
  readonly timestamp: Date
  readonly checks: {
    readonly database: boolean
    readonly redis?: boolean
    readonly cache?: boolean
  }
  readonly message?: string

  private constructor(entity: HealthCheck) {
    this.id = entity.id
    this.status = entity.status.toString()
    this.timestamp = entity.timestamp
    this.checks = entity.checks
    this.message = entity.message
  }

  static fromEntity(entity: HealthCheck): HealthCheckDTO {
    return new HealthCheckDTO(entity)
  }

  toJSON(): HealthCheckJSONData {
    return {
      id: this.id,
      status: this.status,
      timestamp: this.timestamp.toISOString(),
      checks: this.checks,
      message: this.message,
    }
  }
}
