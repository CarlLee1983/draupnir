import type { HealthCheck } from '../../Domain/Aggregates/HealthCheck'

export const HealthCheckMapper = {
  toDatabaseRow(entity: HealthCheck): Record<string, unknown> {
    return {
      id: entity.id,
      timestamp: entity.timestamp,
      status: entity.status.toString(),
      checks: JSON.stringify(entity.checks),
      message: entity.message,
    }
  },
}
