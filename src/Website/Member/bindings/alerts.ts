/**
 * Alerts page bindings for the Member module.
 */
import type { GetAlertHistoryService } from '@/Modules/Alerts/Application/Services/GetAlertHistoryService'
import type { GetBudgetService } from '@/Modules/Alerts/Application/Services/GetBudgetService'
import type { ListWebhookEndpointsService } from '@/Modules/Alerts/Application/Services/ListWebhookEndpointsService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { MEMBER_PAGE_KEYS } from '../keys'
import { MemberAlertsPage } from '../Pages/MemberAlertsPage'

/**
 * Registers the member alerts page in the DI container.
 *
 * @param container - Application container.
 */
export function registerAlertsBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MEMBER_PAGE_KEYS

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
