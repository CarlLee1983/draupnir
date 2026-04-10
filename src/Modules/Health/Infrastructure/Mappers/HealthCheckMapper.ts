/**
 * HealthCheckMapper
 * 將領域聚合根轉換為持久化格式
 */

import { HealthCheck } from '../../Domain/Aggregates/HealthCheck'

export class HealthCheckMapper {
  static toDatabaseRow(entity: HealthCheck): Record<string, unknown> {
    return {
      id: entity.id,
      timestamp: entity.timestamp,
      status: entity.status.toString(),
      checks: JSON.stringify(entity.checks),
      message: entity.message,
    }
  }
}
