import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { GetActiveOrgContractQuotaService } from '@/Modules/Contract/Application/Services/GetActiveOrgContractQuotaService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { SumQuotaAllocatedForOrgService } from '@/Modules/ApiKey/Application/Services/SumQuotaAllocatedForOrgService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { MANAGER_PAGE_KEYS } from '../keys'
import { ManagerDashboardPage } from '../Pages/ManagerDashboardPage'

export function registerDashboardBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MANAGER_PAGE_KEYS

  container.singleton(k.dashboard, (c) => {
    return new ManagerDashboardPage(
      c.make(i) as InertiaService,
      c.make('getActiveOrgContractQuotaService') as GetActiveOrgContractQuotaService,
      c.make('sumQuotaAllocatedForOrgService') as SumQuotaAllocatedForOrgService,
      c.make('listApiKeysService') as ListApiKeysService,
      c.make('getUserMembershipService') as GetUserMembershipService,
    )
  })
}
