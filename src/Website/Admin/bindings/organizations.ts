/**
 * Organizations page bindings for the Admin module.
 */
import type { SumQuotaAllocatedForOrgService } from '@/Modules/ApiKey/Application/Services/SumQuotaAllocatedForOrgService'
import type { GetActiveOrgContractQuotaService } from '@/Modules/Contract/Application/Services/GetActiveOrgContractQuotaService'
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminOrganizationDetailPage } from '../Pages/AdminOrganizationDetailPage'
import { AdminOrganizationsPage } from '../Pages/AdminOrganizationsPage'

/**
 * Registers admin organizations-related pages in the DI container.
 *
 * @param container - Application container.
 */
export function registerOrganizationsBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.organizations,
    (c) =>
      new AdminOrganizationsPage(
        c.make(i) as InertiaService,
        c.make('listOrganizationsService') as ListOrganizationsService,
      ),
  )

  container.singleton(
    k.organizationDetail,
    (c) =>
      new AdminOrganizationDetailPage(
        c.make(i) as InertiaService,
        c.make('getOrganizationService') as GetOrganizationService,
        c.make('listMembersService') as ListMembersService,
        c.make('getActiveOrgContractQuotaService') as GetActiveOrgContractQuotaService,
        c.make('sumQuotaAllocatedForOrgService') as SumQuotaAllocatedForOrgService,
      ),
  )
}
