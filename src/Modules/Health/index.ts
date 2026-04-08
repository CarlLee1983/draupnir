/**
 * Health Module
 * 系統健康檢查模組的公開 API
 */

// Domain
export { HealthStatus, type HealthStatusType } from './Domain/ValueObjects/HealthStatus'
export { HealthCheck, type HealthCheckProps } from './Domain/Aggregates/HealthCheck'
export { HealthCheckService } from './Domain/Services/HealthCheckService'
export type { IHealthCheckRepository } from './Domain/Repositories/IHealthCheckRepository'

// Application
export { PerformHealthCheckService } from './Application/Services/PerformHealthCheckService'
export { HealthCheckDTO, type HealthCheckJSONData } from './Application/DTOs/HealthCheckDTO'

// Infrastructure
export { MemoryHealthCheckRepository } from './Infrastructure/Repositories/MemoryHealthCheckRepository'
export { HealthServiceProvider } from './Infrastructure/Providers/HealthServiceProvider'

// Presentation
export { HealthController } from './Presentation/Controllers/HealthController'
export { registerHealthRoutes } from './Presentation/Routes/health.routes'
