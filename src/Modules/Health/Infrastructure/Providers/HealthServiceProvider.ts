import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'
import type { ISystemHealthChecker } from '../../Domain/Ports/ISystemHealthChecker'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'
import { MemoryHealthCheckRepository } from '../Repositories/MemoryHealthCheckRepository'
import { SystemHealthChecker } from '../Services/SystemHealthChecker'

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

  override boot(_context: unknown): void {}
}
