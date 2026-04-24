import { registerHealthWithGravito } from '@/Shared/Infrastructure/Framework/GravitoHealthAdapter'
import type { IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'
import type { ISystemHealthChecker } from '../../Domain/Ports/ISystemHealthChecker'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'
import { MemoryHealthCheckRepository } from '../Repositories/MemoryHealthCheckRepository'
import { SystemHealthChecker } from '../Services/SystemHealthChecker'

export class HealthServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    container.singleton('healthRepository', () => new MemoryHealthCheckRepository())
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('systemHealthChecker', () => new SystemHealthChecker(null, null, null))
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind(
      'healthCheckService',
      (c: IContainer) =>
        new PerformHealthCheckService(
          c.make('healthRepository') as IHealthCheckRepository,
          c.make('systemHealthChecker') as ISystemHealthChecker,
        ),
    )
  }

  registerRoutes(context: IRouteContext): void {
    registerHealthWithGravito(context)
  }
}
