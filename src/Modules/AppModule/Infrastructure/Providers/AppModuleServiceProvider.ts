// src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts

import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
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

export class AppModuleServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('appModuleRepository', () => new AppModuleRepository(db))
    container.singleton('moduleSubscriptionRepository', () => new ModuleSubscriptionRepository(db))

    container.singleton('ensureCoreAppModulesService', (c: IContainer) => {
      return new EnsureCoreAppModulesService(c.make('appModuleRepository') as IAppModuleRepository)
    })

    container.singleton('provisionOrganizationDefaultsService', (c: IContainer) => {
      return new ProvisionOrganizationDefaultsService(
        c.make('appModuleRepository') as IAppModuleRepository,
        c.make('contractRepository') as IContractRepository,
        c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
      )
    })

    container.bind('registerModuleService', (c: IContainer) => {
      return new RegisterModuleService(c.make('appModuleRepository') as IAppModuleRepository)
    })

    container.bind('subscribeModuleService', (c: IContainer) => {
      return new SubscribeModuleService(
        c.make('appModuleRepository') as IAppModuleRepository,
        c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
      )
    })

    container.bind('unsubscribeModuleService', () => {
      return new UnsubscribeModuleService(
        container.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
      )
    })

    container.bind('checkModuleAccessService', (c: IContainer) => {
      return new CheckModuleAccessService(
        c.make('contractRepository') as IContractRepository,
        c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
        c.make('appModuleRepository') as IAppModuleRepository,
      )
    })

    container.bind('listModulesService', (c: IContainer) => {
      return new ListModulesService(c.make('appModuleRepository') as IAppModuleRepository)
    })

    container.bind('getModuleDetailService', (c: IContainer) => {
      return new GetModuleDetailService(c.make('appModuleRepository') as IAppModuleRepository)
    })

    container.bind('listOrgSubscriptionsService', (c: IContainer) => {
      return new ListOrgSubscriptionsService(
        c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
      )
    })
  }

  override boot(): void {
    console.log('🧩 [AppModule] Module loaded')
  }
}
