/**
 * Health module public surface.
 *
 * Provides system health monitoring, diagnostic checks for infrastructure
 * dependencies (Database, Redis, etc.), and health check history.
 */

// Application
export { HealthCheckDTO, type HealthCheckJSONData } from './Application/DTOs/HealthCheckDTO'
export { PerformHealthCheckService } from './Application/Services/PerformHealthCheckService'

// Domain
export { HealthCheck, type HealthCheckProps } from './Domain/Aggregates/HealthCheck'
export type { ISystemHealthChecker } from './Domain/Ports/ISystemHealthChecker'
export type { IHealthCheckRepository } from './Domain/Repositories/IHealthCheckRepository'
export { HealthCheckService, type SystemChecks } from './Domain/Services/HealthCheckService'
export { HealthStatus, type HealthStatusType } from './Domain/ValueObjects/HealthStatus'

// Infrastructure
export { HealthCheckMapper } from './Infrastructure/Mappers/HealthCheckMapper'
export { HealthServiceProvider } from './Infrastructure/Providers/HealthServiceProvider'
export { MemoryHealthCheckRepository } from './Infrastructure/Repositories/MemoryHealthCheckRepository'
export { SystemHealthChecker } from './Infrastructure/Services/SystemHealthChecker'

// Presentation
export { HealthController } from './Presentation/Controllers/HealthController'
export { registerHealthRoutes } from './Presentation/Routes/health.routes'
