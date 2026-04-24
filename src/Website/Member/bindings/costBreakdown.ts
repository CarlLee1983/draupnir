import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MEMBER_PAGE_KEYS } from '../keys'
import { MemberCostBreakdownPage } from '../Pages/MemberCostBreakdownPage'

export function registerCostBreakdownBindings(container: IContainer): void {
  const k = MEMBER_PAGE_KEYS

  container.singleton(k.costBreakdown, () => new MemberCostBreakdownPage())
}
