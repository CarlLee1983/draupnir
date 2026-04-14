import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { registerHealthWithGravito } from '@/Shared/Infrastructure/Framework/GravitoHealthAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'
import type { ISystemHealthChecker } from '../../Domain/Ports/ISystemHealthChecker'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'
import { MemoryHealthCheckRepository } from '../Repositories/MemoryHealthCheckRepository'
import { SystemHealthChecker } from '../Services/SystemHealthChecker'

export class HealthServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
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

  registerRoutes(context: IRouteContext): void {
    registerHealthWithGravito(context)
  }

  override boot(_context: unknown): void {}
}
