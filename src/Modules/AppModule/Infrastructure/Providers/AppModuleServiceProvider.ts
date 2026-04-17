import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { setCheckModuleAccessService } from '@/Shared/Infrastructure/Middleware/ModuleAccessMiddleware'
import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { CheckModuleAccessService } from '../../Application/Services/CheckModuleAccessService'
import { EnsureCoreAppModulesService } from '../../Application/Services/EnsureCoreAppModulesService'
import { GetModuleDetailService } from '../../Application/Services/GetModuleDetailService'
import { ListModulesService } from '../../Application/Services/ListModulesService'
import { ListOrgSubscriptionsService } from '../../Application/Services/ListOrgSubscriptionsService'
import { ProvisionOrganizationDefaultsService } from '../../Application/Services/ProvisionOrganizationDefaultsService'
import { RegisterModuleService } from '../../Application/Services/RegisterModuleService'
import { SubscribeModuleService } from '../../Application/Services/SubscribeModuleService'
import { UnsubscribeModuleService } from '../../Application/Services/UnsubscribeModuleService'
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import type { IModuleSubscriptionRepository } from '../../Domain/Repositories/IModuleSubscriptionRepository'
import { AppModuleRepository } from '../Repositories/AppModuleRepository'
import { ModuleSubscriptionRepository } from '../Repositories/ModuleSubscriptionRepository'
import { AppModuleController } from '../../Presentation/Controllers/AppModuleController'
import { registerAppModuleRoutes } from '../../Presentation/Routes/appModule.routes'

export class AppModuleServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.singleton('appModuleRepository', () => new AppModuleRepository(db))
    container.singleton('moduleSubscriptionRepository', () => new ModuleSubscriptionRepository(db))
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.singleton('ensureCoreAppModulesService', (c: IContainer) =>
      new EnsureCoreAppModulesService(c.make('appModuleRepository') as IAppModuleRepository)
    )
    container.singleton('provisionOrganizationDefaultsService', (c: IContainer) =>
      new ProvisionOrganizationDefaultsService(
        c.make('appModuleRepository') as IAppModuleRepository,
        c.make('contractRepository') as IContractRepository,
        c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
        c.make('llmGatewayClient') as ILLMGatewayClient,
        c.make('organizationRepository') as IOrganizationRepository,
        getCurrentDatabaseAccess() as IDatabaseAccess,
      )
    )
    container.bind('registerModuleService', (c: IContainer) =>
      new RegisterModuleService(c.make('appModuleRepository') as IAppModuleRepository)
    )
    container.bind('subscribeModuleService', (c: IContainer) => new SubscribeModuleService(
      c.make('appModuleRepository') as IAppModuleRepository,
      c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
    ))
    container.bind('unsubscribeModuleService', (c: IContainer) =>
      new UnsubscribeModuleService(c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository)
    )
    container.bind('checkModuleAccessService', (c: IContainer) => new CheckModuleAccessService(
      c.make('contractRepository') as IContractRepository,
      c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
      c.make('appModuleRepository') as IAppModuleRepository,
    ))
    container.bind('listModulesService', (c: IContainer) =>
      new ListModulesService(c.make('appModuleRepository') as IAppModuleRepository)
    )
    container.bind('getModuleDetailService', (c: IContainer) =>
      new GetModuleDetailService(c.make('appModuleRepository') as IAppModuleRepository)
    )
    container.bind('listOrgSubscriptionsService', (c: IContainer) =>
      new ListOrgSubscriptionsService(c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository)
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('appModuleController', (c: IContainer) => new AppModuleController(
      c.make('registerModuleService') as RegisterModuleService,
      c.make('subscribeModuleService') as SubscribeModuleService,
      c.make('unsubscribeModuleService') as UnsubscribeModuleService,
      c.make('listModulesService') as ListModulesService,
      c.make('getModuleDetailService') as GetModuleDetailService,
      c.make('listOrgSubscriptionsService') as ListOrgSubscriptionsService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('appModuleController') as AppModuleController
    registerAppModuleRoutes(context.router, controller)
  }

  override boot(container: IContainer): void {
    // Middleware 初始化（不是 DI 註冊）
    const checkAccessService = container.make('checkModuleAccessService') as CheckModuleAccessService
    setCheckModuleAccessService(checkAccessService)
    console.log('🧩 [AppModule] Module loaded')
  }
}
