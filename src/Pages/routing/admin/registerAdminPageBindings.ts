/**
 * Registers admin Inertia page classes as container singletons with their Application-layer dependencies.
 */
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { ListModulesService } from '@/Modules/AppModule/Application/Services/ListModulesService'
import type { RegisterModuleService } from '@/Modules/AppModule/Application/Services/RegisterModuleService'
import type { ChangeUserStatusService } from '@/Modules/Auth/Application/Services/ChangeUserStatusService'
import type { GetUserDetailService } from '@/Modules/Auth/Application/Services/GetUserDetailService'
import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { ActivateContractService } from '@/Modules/Contract/Application/Services/ActivateContractService'
import type { CreateContractService } from '@/Modules/Contract/Application/Services/CreateContractService'
import type { GetContractDetailService } from '@/Modules/Contract/Application/Services/GetContractDetailService'
import type { ListAdminContractsService } from '@/Modules/Contract/Application/Services/ListAdminContractsService'
import type { TerminateContractService } from '@/Modules/Contract/Application/Services/TerminateContractService'
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { InertiaService } from '@/Pages/InertiaService'
import { PAGE_CONTAINER_KEYS } from '@/Pages/pageContainerKeys'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

import { AdminApiKeysPage } from '../../Admin/AdminApiKeysPage'
import { AdminContractCreatePage } from '../../Admin/AdminContractCreatePage'
import { AdminContractDetailPage } from '../../Admin/AdminContractDetailPage'
import { AdminContractsPage } from '../../Admin/AdminContractsPage'
import { AdminDashboardPage } from '../../Admin/AdminDashboardPage'
import { AdminModuleCreatePage } from '../../Admin/AdminModuleCreatePage'
import { AdminModulesPage } from '../../Admin/AdminModulesPage'
import { AdminOrganizationDetailPage } from '../../Admin/AdminOrganizationDetailPage'
import { AdminOrganizationsPage } from '../../Admin/AdminOrganizationsPage'
import { AdminReportsPage } from '../../Admin/AdminReportsPage'
import { AdminReportTemplatePage } from '../../Admin/AdminReportTemplatePage'
import { AdminUsageSyncPage } from '../../Admin/AdminUsageSyncPage'
import { AdminUserDetailPage } from '../../Admin/AdminUserDetailPage'
import { AdminUsersPage } from '../../Admin/AdminUsersPage'

import { ADMIN_PAGE_KEYS } from './adminPageKeys'

/**
 * @param container - Gravito DI container; `InertiaService` must already be bound under
 *   `PAGE_CONTAINER_KEYS.inertiaService`.
 */
export function registerAdminPageBindings(container: IContainer): void {
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
      ),
  )

  container.singleton(
    k.users,
    (c) =>
      new AdminUsersPage(
        c.make(i) as InertiaService,
        c.make('listUsersService') as ListUsersService,
      ),
  )

  container.singleton(
    k.userDetail,
    (c) =>
      new AdminUserDetailPage(
        c.make(i) as InertiaService,
        c.make('getProfileService') as GetProfileService,
        c.make('getUserDetailService') as GetUserDetailService,
        c.make('changeUserStatusService') as ChangeUserStatusService,
      ),
  )

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
      ),
  )

  container.singleton(
    k.contracts,
    (c) =>
      new AdminContractsPage(
        c.make(i) as InertiaService,
        c.make('listAdminContractsService') as ListAdminContractsService,
      ),
  )

  container.singleton(
    k.contractCreate,
    (c) =>
      new AdminContractCreatePage(
        c.make(i) as InertiaService,
        c.make('createContractService') as CreateContractService,
      ),
  )

  container.singleton(
    k.contractDetail,
    (c) =>
      new AdminContractDetailPage(
        c.make(i) as InertiaService,
        c.make('getContractDetailService') as GetContractDetailService,
        c.make('activateContractService') as ActivateContractService,
        c.make('terminateContractService') as TerminateContractService,
      ),
  )

  container.singleton(
    k.modules,
    (c) =>
      new AdminModulesPage(
        c.make(i) as InertiaService,
        c.make('listModulesService') as ListModulesService,
      ),
  )

  container.singleton(
    k.moduleCreate,
    (c) =>
      new AdminModuleCreatePage(
        c.make(i) as InertiaService,
        c.make('registerModuleService') as RegisterModuleService,
      ),
  )

  container.singleton(
    k.apiKeys,
    (c) =>
      new AdminApiKeysPage(
        c.make(i) as InertiaService,
        c.make('listApiKeysService') as ListApiKeysService,
        c.make('listOrganizationsService') as ListOrganizationsService,
      ),
  )

  container.singleton(k.usageSync, (c) => new AdminUsageSyncPage(c.make(i) as InertiaService))

  container.singleton(
    k.reports,
    (c) => new AdminReportsPage(c.make(i) as InertiaService, c.make('reportRepository') as any),
  )

  container.singleton(
    k.reportTemplate,
    (c) => new AdminReportTemplatePage(c.make(i) as InertiaService),
  )
}
