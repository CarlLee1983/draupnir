/**
 * HealthCheck Aggregate Root
 * 系統健康狀態的聚合根
 */

import { HealthStatus } from '../ValueObjects/HealthStatus'

export interface HealthCheckProps {
  id: string
  timestamp: Date
  status: HealthStatus
  checks: {
    database: boolean
    redis?: boolean
    cache?: boolean
  }
  message?: string
}

export class HealthCheck {
  private props: HealthCheckProps

  private constructor(props: HealthCheckProps) {
    this.props = props
  }

  /**
   * 創建新的健康檢查記錄
   */
  static create(id: string, checks: HealthCheckProps['checks']): HealthCheck {
    // 確定整體狀態
    const allHealthy = Object.values(checks).every((v) => v !== false)
    const status = allHealthy ? HealthStatus.healthy() : HealthStatus.degraded()

    return new HealthCheck({
      id,
      timestamp: new Date(),
      status,
      checks,
      message: allHealthy ? 'All systems operational' : 'Some services degraded'
    })
  }

  /**
   * 從數據庫行重構
   */
  static fromDatabase(row: any): HealthCheck {
    return new HealthCheck({
      id: row.id,
      timestamp: new Date(row.timestamp),
      status: new HealthStatus(row.status),
      checks: JSON.parse(row.checks),
      message: row.message
    })
  }

  /**
   * 更新健康狀態
   */
  update(checks: HealthCheckProps['checks'], message?: string): void {
    const allHealthy = Object.values(checks).every((v) => v !== false)
    this.props.checks = checks
    this.props.status = allHealthy ? HealthStatus.healthy() : HealthStatus.degraded()
    this.props.message = message || (allHealthy ? 'All systems operational' : 'Some services degraded')
    this.props.timestamp = new Date()
  }

  /**
   * 標記為不健康
   */
  markAsUnhealthy(message: string): void {
    this.props.status = HealthStatus.unhealthy()
    this.props.message = message
    this.props.timestamp = new Date()
  }

  // Getters
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

  /**
   * 轉換為數據庫行格式
   */
  toDatabaseRow(): any {
    return {
      id: this.props.id,
      timestamp: this.props.timestamp,
      status: this.props.status.value,
      checks: JSON.stringify(this.props.checks),
      message: this.props.message
    }
  }
}
