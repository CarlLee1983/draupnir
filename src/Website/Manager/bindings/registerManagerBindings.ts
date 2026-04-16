/**
 * Registers manager Inertia page classes as container singletons with their
 * Application-layer dependencies.
 */
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { UpdateOrganizationService } from '@/Modules/Organization/Application/Services/UpdateOrganizationService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ManagerDashboardPage } from '../Pages/ManagerDashboardPage'
import { ManagerOrganizationPage } from '../Pages/ManagerOrganizationPage'
import { MANAGER_PAGE_KEYS } from '../keys'

export function registerManagerBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MANAGER_PAGE_KEYS

  container.singleton(k.dashboard, (c) => {
    return new ManagerDashboardPage(
      c.make(i) as InertiaService,
      c.make('getBalanceService') as GetBalanceService,
      c.make('listApiKeysService') as ListApiKeysService,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    )
  })

  container.singleton(k.organization, (c) => {
    return new ManagerOrganizationPage(
      c.make(i) as InertiaService,
      c.make('getOrganizationService') as GetOrganizationService,
      c.make('listContractsService') as ListContractsService,
      c.make('updateOrganizationService') as UpdateOrganizationService,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    )
  })

  // Phase H–K 會補齊其他 page 的 binding
}
