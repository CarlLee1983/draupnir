import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { UpdateOrganizationService } from '@/Modules/Organization/Application/Services/UpdateOrganizationService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { MANAGER_PAGE_KEYS } from '../keys'
import { ManagerOrganizationPage } from '../Pages/ManagerOrganizationPage'

export function registerOrganizationBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MANAGER_PAGE_KEYS

  container.singleton(k.organization, (c) => {
    return new ManagerOrganizationPage(
      c.make(i) as InertiaService,
      c.make('getOrganizationService') as GetOrganizationService,
      c.make('listContractsService') as ListContractsService,
      c.make('updateOrganizationService') as UpdateOrganizationService,
      c.make('getUserMembershipService') as GetUserMembershipService,
    )
  })
}
