/**
 * Cost breakdown page bindings for the Member module.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MEMBER_PAGE_KEYS } from '../keys'
import { MemberCostBreakdownPage } from '../Pages/MemberCostBreakdownPage'

/**
 * Registers the member cost breakdown page in the DI container.
 *
 * @param container - Application container.
 */
export function registerCostBreakdownBindings(container: IContainer): void {
  const k = MEMBER_PAGE_KEYS

  container.singleton(k.costBreakdown, () => new MemberCostBreakdownPage())
}
