/**
 * Registers member Inertia page classes as container singletons with their Application-layer dependencies.
 */

import type { GetAlertHistoryService } from '@/Modules/Alerts/Application/Services/GetAlertHistoryService'
import type { GetBudgetService } from '@/Modules/Alerts/Application/Services/GetBudgetService'
import type { ListWebhookEndpointsService } from '@/Modules/Alerts/Application/Services/ListWebhookEndpointsService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { GetPendingInvitationsService } from '@/Modules/Organization/Application/Services/GetPendingInvitationsService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { GetUsageChartService } from '@/Modules/Dashboard/Application/Services/GetUsageChartService'
import type { ChangePasswordService } from '@/Modules/Auth/Application/Services/ChangePasswordService'
import type { ListSessionsService } from '@/Modules/Auth/Application/Services/ListSessionsService'
import type { RevokeAllSessionsService } from '@/Modules/Auth/Application/Services/RevokeAllSessionsService'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MemberAlertsPage } from '../Pages/MemberAlertsPage'
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

  container.singleton(k.dashboard, () => {
    return new MemberDashboardPage()
  })

  container.singleton(
    k.apiKeys,
    (c) =>
      new MemberApiKeysPage(
        c.make(i) as InertiaService,
        c.make('listApiKeysService') as ListApiKeysService,
        c.make('getUserMembershipService') as GetUserMembershipService,
        c.make('getBalanceService') as GetBalanceService,
        c.make('getPendingInvitationsService') as GetPendingInvitationsService,
      ),
  )

  container.singleton(
    k.usage,
    (c) =>
      new MemberUsagePage(
        c.make(i) as InertiaService,
        c.make('getUsageChartService') as GetUsageChartService,
        c.make('getUserMembershipService') as GetUserMembershipService,
      ),
  )

  container.singleton(k.costBreakdown, () => new MemberCostBreakdownPage())

  container.singleton(k.contracts, () => new MemberContractsPage())

  container.singleton(
    k.settings,
    (c) =>
      new MemberSettingsPage(
        c.make(i) as InertiaService,
        c.make('getProfileService') as GetProfileService,
        c.make('updateProfileService') as UpdateProfileService,
        c.make('changePasswordService') as ChangePasswordService,
        c.make('listSessionsService') as ListSessionsService,
        c.make('revokeAllSessionsService') as RevokeAllSessionsService,
      ),
  )

  container.singleton(
    k.alerts,
    (c) =>
      new MemberAlertsPage(
        c.make(i) as InertiaService,
        c.make('getBudgetService') as GetBudgetService,
        c.make('listWebhookEndpointsService') as ListWebhookEndpointsService,
        c.make('getAlertHistoryService') as GetAlertHistoryService,
        c.make('getUserMembershipService') as GetUserMembershipService,
      ),
  )
}
