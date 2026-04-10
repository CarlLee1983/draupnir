/**
 * HealthCheck Aggregate Root
 * 系統健康狀態的聚合根
 */

import { HealthStatus } from '../ValueObjects/HealthStatus'

export interface HealthCheckProps {
  readonly id: string
  readonly timestamp: Date
  readonly status: HealthStatus
  readonly checks: {
    readonly database: boolean
    readonly redis?: boolean
    readonly cache?: boolean
  }
  readonly message?: string
}

export class HealthCheck {
  private readonly props: HealthCheckProps

  private constructor(props: HealthCheckProps) {
    this.props = props
  }

  /**
   * 創建新的健康檢查記錄
   */
  static create(id: string, checks: HealthCheckProps['checks']): HealthCheck {
    const allHealthy = Object.values(checks).every((v) => v !== false)
    const status = allHealthy ? HealthStatus.healthy() : HealthStatus.degraded()

    return new HealthCheck({
      id,
      timestamp: new Date(),
      status,
      checks,
      message: allHealthy ? 'All systems operational' : 'Some services degraded',
    })
  }

  /**
   * 從數據庫行重構
   */
  static fromDatabase(row: Record<string, unknown>): HealthCheck {
    return new HealthCheck({
      id: row.id as string,
      timestamp: new Date(row.timestamp as string),
      status: HealthStatus.from(row.status as string),
      checks: JSON.parse(row.checks as string),
      message: row.message as string | undefined,
    })
  }

  /**
   * 更新健康狀態（返回新實例，不可變）
   */
  update(checks: HealthCheckProps['checks'], message?: string): HealthCheck {
    const allHealthy = Object.values(checks).every((v) => v !== false)
    return new HealthCheck({
      ...this.props,
      checks,
      status: allHealthy ? HealthStatus.healthy() : HealthStatus.degraded(),
      message: message || (allHealthy ? 'All systems operational' : 'Some services degraded'),
      timestamp: new Date(),
    })
  }

  /**
   * 標記為不健康（返回新實例，不可變）
   */
  markAsUnhealthy(message: string): HealthCheck {
    return new HealthCheck({
      ...this.props,
      status: HealthStatus.unhealthy(),
      message,
      timestamp: new Date(),
    })
  }

  get id(): string {
    return this.props.id
  }

  get timestamp(): Date {
    return this.props.timestamp
  }

  get status(): HealthStatus {
    return this.props.status
  }

  get checks(): HealthCheckProps['checks'] {
    return this.props.checks
  }

  get message(): string | undefined {
    return this.props.message
  }
}
