/**
 * Dashboard page bindings for the Member module.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MEMBER_PAGE_KEYS } from '../keys'
import { MemberDashboardPage } from '../Pages/MemberDashboardPage'

/**
 * Registers the member dashboard page in the DI container.
 *
 * @param container - Application container.
 */
export function registerDashboardBindings(container: IContainer): void {
  const k = MEMBER_PAGE_KEYS

  container.singleton(k.dashboard, () => {
    return new MemberDashboardPage()
  })
}
