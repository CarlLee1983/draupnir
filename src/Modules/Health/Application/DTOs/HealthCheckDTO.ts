/**
 * HealthCheckDTO
 * 健康檢查數據傳輸物件
 */

import { HealthCheck } from '../../Domain/Aggregates/HealthCheck'

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
  id!: string
  status!: string
  timestamp!: Date
  checks!: {
    database: boolean
    redis?: boolean
    cache?: boolean
  }
  message?: string

  /**
   * 從領域實體轉換
   */
  static fromEntity(entity: HealthCheck): HealthCheckDTO {
    const dto = new HealthCheckDTO()
    dto.id = entity.id
    dto.status = entity.status.toString()
    dto.timestamp = entity.timestamp
    dto.checks = entity.checks
    dto.message = entity.message
    return dto
  }

  /**
   * 轉換為 JSON (用於 HTTP 響應)
   */
  toJSON(): HealthCheckJSONData {
    return {
      id: this.id,
      status: this.status,
      timestamp: this.timestamp.toISOString(),
      checks: this.checks,
      message: this.message
    }
  }
}
