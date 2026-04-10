/**
 * Health Module
 * 系統健康檢查模組的公開 API
 */

// Domain
export { HealthStatus, type HealthStatusType } from './Domain/ValueObjects/HealthStatus'
export { HealthCheck, type HealthCheckProps } from './Domain/Aggregates/HealthCheck'
export { HealthCheckService, type SystemChecks } from './Domain/Services/HealthCheckService'
export type { IHealthCheckRepository } from './Domain/Repositories/IHealthCheckRepository'
export type { ISystemHealthChecker } from './Domain/Ports/ISystemHealthChecker'

// Application
export { PerformHealthCheckService } from './Application/Services/PerformHealthCheckService'
export { HealthCheckDTO, type HealthCheckJSONData } from './Application/DTOs/HealthCheckDTO'

// Infrastructure
export { MemoryHealthCheckRepository } from './Infrastructure/Repositories/MemoryHealthCheckRepository'
export { SystemHealthChecker } from './Infrastructure/Services/SystemHealthChecker'
export { HealthCheckMapper } from './Infrastructure/Mappers/HealthCheckMapper'
export { HealthServiceProvider } from './Infrastructure/Providers/HealthServiceProvider'

// Presentation
export { HealthController } from './Presentation/Controllers/HealthController'
export { registerHealthRoutes } from './Presentation/Routes/health.routes'
