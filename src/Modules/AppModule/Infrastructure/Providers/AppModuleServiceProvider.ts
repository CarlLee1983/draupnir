// src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { AppModuleRepository } from '../Repositories/AppModuleRepository'
import { ModuleSubscriptionRepository } from '../Repositories/ModuleSubscriptionRepository'
import { RegisterModuleService } from '../../Application/Services/RegisterModuleService'
import { SubscribeModuleService } from '../../Application/Services/SubscribeModuleService'
import { UnsubscribeModuleService } from '../../Application/Services/UnsubscribeModuleService'
import { CheckModuleAccessService } from '../../Application/Services/CheckModuleAccessService'
import { ListModulesService } from '../../Application/Services/ListModulesService'
import { GetModuleDetailService } from '../../Application/Services/GetModuleDetailService'
import { ListOrgSubscriptionsService } from '../../Application/Services/ListOrgSubscriptionsService'
import type { ContractRepository } from '@/Modules/Contract/Infrastructure/Repositories/ContractRepository'

export class AppModuleServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('appModuleRepository', () => new AppModuleRepository(db))
    container.singleton('moduleSubscriptionRepository', () => new ModuleSubscriptionRepository(db))

    container.bind('registerModuleService', (c: IContainer) => {
      return new RegisterModuleService(
        c.make('appModuleRepository') as AppModuleRepository,
      )
    })

    container.bind('subscribeModuleService', (c: IContainer) => {
      return new SubscribeModuleService(
        c.make('appModuleRepository') as AppModuleRepository,
        c.make('moduleSubscriptionRepository') as ModuleSubscriptionRepository,
      )
    })

    container.bind('unsubscribeModuleService', () => {
      return new UnsubscribeModuleService(
        container.make('moduleSubscriptionRepository') as ModuleSubscriptionRepository,
      )
    })

    container.bind('checkModuleAccessService', (c: IContainer) => {
      return new CheckModuleAccessService(
        c.make('contractRepository') as ContractRepository,
        c.make('moduleSubscriptionRepository') as ModuleSubscriptionRepository,
        c.make('appModuleRepository') as AppModuleRepository,
      )
    })

    container.bind('listModulesService', (c: IContainer) => {
      return new ListModulesService(
        c.make('appModuleRepository') as AppModuleRepository,
      )
    })

    container.bind('getModuleDetailService', (c: IContainer) => {
      return new GetModuleDetailService(
        c.make('appModuleRepository') as AppModuleRepository,
      )
    })

    container.bind('listOrgSubscriptionsService', (c: IContainer) => {
      return new ListOrgSubscriptionsService(
        c.make('moduleSubscriptionRepository') as ModuleSubscriptionRepository,
      )
    })
  }

  override boot(): void {
    console.log('🧩 [AppModule] Module loaded')
  }
}
