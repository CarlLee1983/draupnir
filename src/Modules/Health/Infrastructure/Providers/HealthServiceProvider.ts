import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'
import type { ISystemHealthChecker } from '../../Domain/Ports/ISystemHealthChecker'
import { MemoryHealthCheckRepository } from '../Repositories/MemoryHealthCheckRepository'
import { SystemHealthChecker } from '../Services/SystemHealthChecker'
import { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'

export class HealthServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('healthRepository', () => {
      return new MemoryHealthCheckRepository()
    })

    container.singleton('systemHealthChecker', () => {
      return new SystemHealthChecker(null, null, null)
    })

    container.bind('healthCheckService', (c: IContainer) => {
      const repository = c.make('healthRepository') as IHealthCheckRepository
      const healthChecker = c.make('systemHealthChecker') as ISystemHealthChecker
      return new PerformHealthCheckService(repository, healthChecker)
    })
  }

  override boot(_context: unknown): void {
  }
}
