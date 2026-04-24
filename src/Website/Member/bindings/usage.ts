/**
 * Usage page bindings for the Member module.
 */
import type { GetUsageChartService } from '@/Modules/Dashboard/Application/Services/GetUsageChartService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { MEMBER_PAGE_KEYS } from '../keys'
import { MemberUsagePage } from '../Pages/MemberUsagePage'

/**
 * Registers the member usage page in the DI container.
 *
 * @param container - Application container.
 */
export function registerUsageBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MEMBER_PAGE_KEYS

  container.singleton(
    k.usage,
    (c) =>
      new MemberUsagePage(
        c.make(i) as InertiaService,
        c.make('getUsageChartService') as GetUsageChartService,
        c.make('getUserMembershipService') as GetUserMembershipService,
      ),
  )
}
