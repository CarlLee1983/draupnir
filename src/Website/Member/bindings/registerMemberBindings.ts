/**
 * Registers member Inertia page classes as container singletons with their Application-layer dependencies.
 */

import type { GetAlertHistoryService } from '@/Modules/Alerts/Application/Services/GetAlertHistoryService'
import type { GetBudgetService } from '@/Modules/Alerts/Application/Services/GetBudgetService'
import type { ListWebhookEndpointsService } from '@/Modules/Alerts/Application/Services/ListWebhookEndpointsService'
import type { CreateApiKeyService } from '@/Modules/ApiKey/Application/Services/CreateApiKeyService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { RevokeApiKeyService } from '@/Modules/ApiKey/Application/Services/RevokeApiKeyService'
import type { UpdateApiKeyBudgetService } from '@/Modules/ApiKey/Application/Services/UpdateApiKeyBudgetService'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { GetUsageChartService } from '@/Modules/Dashboard/Application/Services/GetUsageChartService'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MemberAlertsPage } from '../Pages/MemberAlertsPage'
import { MemberApiKeyBudgetPage } from '../Pages/MemberApiKeyBudgetPage'
import { MemberApiKeyCreatePage } from '../Pages/MemberApiKeyCreatePage'
import { MemberApiKeyRevokeHandler } from '../Pages/MemberApiKeyRevokeHandler'
import { MemberApiKeysPage } from '../Pages/MemberApiKeysPage'
import { MemberContractsPage } from '../Pages/MemberContractsPage'
import { MemberCostBreakdownPage } from '../Pages/MemberCostBreakdownPage'
import { MemberDashboardPage } from '../Pages/MemberDashboardPage'
import { MemberSettingsPage } from '../Pages/MemberSettingsPage'
import { MemberUsagePage } from '../Pages/MemberUsagePage'

import { MEMBER_PAGE_KEYS } from '../keys'

/**
 * Member Page Bindings
 *
 * Registers member-area page handlers as container singletons. Each binding
 * injects the required Application-layer services to bridge the presentation
 * layer with core business logic.
 */

export function registerMemberBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MEMBER_PAGE_KEYS

  container.singleton(k.dashboard, (c) => {
    return new MemberDashboardPage(
      c.make(i) as InertiaService,
      c.make('getBalanceService') as GetBalanceService,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    )
  })

  container.singleton(
    k.apiKeys,
    (c) =>
      new MemberApiKeysPage(
        c.make(i) as InertiaService,
        c.make('listApiKeysService') as ListApiKeysService,
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      ),
  )

  container.singleton(
    k.apiKeyCreate,
    (c) =>
      new MemberApiKeyCreatePage(
        c.make(i) as InertiaService,
        c.make('createApiKeyService') as CreateApiKeyService,
      ),
  )

  container.singleton(
    k.apiKeyBudget,
    (c) =>
      new MemberApiKeyBudgetPage(
        c.make(i) as InertiaService,
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('updateApiKeyBudgetService') as UpdateApiKeyBudgetService,
      ),
  )

  container.singleton(
    k.apiKeyRevoke,
    (c) => new MemberApiKeyRevokeHandler(c.make('revokeApiKeyService') as RevokeApiKeyService),
  )

  container.singleton(
    k.usage,
    (c) =>
      new MemberUsagePage(
        c.make(i) as InertiaService,
        c.make('getUsageChartService') as GetUsageChartService,
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      ),
  )

  container.singleton(k.costBreakdown, (c) => {
    return new MemberCostBreakdownPage(
      c.make(i) as InertiaService,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    )
  })

  container.singleton(
    k.contracts,
    (c) =>
      new MemberContractsPage(
        c.make(i) as InertiaService,
        c.make('listContractsService') as ListContractsService,
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      ),
  )

  container.singleton(
    k.settings,
    (c) =>
      new MemberSettingsPage(
        c.make(i) as InertiaService,
        c.make('getProfileService') as GetProfileService,
        c.make('updateProfileService') as UpdateProfileService,
      ),
  )

  container.singleton(
    k.ALERTS,
    (c) =>
      new MemberAlertsPage(
        c.make(i) as InertiaService,
        c.make('getBudgetService') as GetBudgetService,
        c.make('listWebhookEndpointsService') as ListWebhookEndpointsService,
        c.make('getAlertHistoryService') as GetAlertHistoryService,
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      ),
  )
}
