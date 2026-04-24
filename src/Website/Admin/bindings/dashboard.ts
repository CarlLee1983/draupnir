import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { ListAdminContractsService } from '@/Modules/Contract/Application/Services/ListAdminContractsService'
import type { GetAdminPlatformUsageTrendService } from '@/Modules/Dashboard/Application/Services/GetAdminPlatformUsageTrendService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminDashboardPage } from '../Pages/AdminDashboardPage'

export function registerDashboardBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.dashboard,
    (c) =>
      new AdminDashboardPage(
        c.make(i) as InertiaService,
        c.make('listUsersService') as ListUsersService,
        c.make('listOrganizationsService') as ListOrganizationsService,
        c.make('listAdminContractsService') as ListAdminContractsService,
        c.make('getAdminPlatformUsageTrendService') as GetAdminPlatformUsageTrendService,
      ),
  )
}
