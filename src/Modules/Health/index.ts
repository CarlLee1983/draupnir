/**
 * Health Module
 * 系統健康檢查模組的公開 API
 */

export { HealthCheckDTO, type HealthCheckJSONData } from './Application/DTOs/HealthCheckDTO'
// Application
export { PerformHealthCheckService } from './Application/Services/PerformHealthCheckService'
export { HealthCheck, type HealthCheckProps } from './Domain/Aggregates/HealthCheck'
export type { ISystemHealthChecker } from './Domain/Ports/ISystemHealthChecker'
export type { IHealthCheckRepository } from './Domain/Repositories/IHealthCheckRepository'
export { HealthCheckService, type SystemChecks } from './Domain/Services/HealthCheckService'
// Domain
export { HealthStatus, type HealthStatusType } from './Domain/ValueObjects/HealthStatus'
export { HealthCheckMapper } from './Infrastructure/Mappers/HealthCheckMapper'
export { HealthServiceProvider } from './Infrastructure/Providers/HealthServiceProvider'
// Infrastructure
export { MemoryHealthCheckRepository } from './Infrastructure/Repositories/MemoryHealthCheckRepository'
export { SystemHealthChecker } from './Infrastructure/Services/SystemHealthChecker'

// Presentation
export { HealthController } from './Presentation/Controllers/HealthController'
export { registerHealthRoutes } from './Presentation/Routes/health.routes'
