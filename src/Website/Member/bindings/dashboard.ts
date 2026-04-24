import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MEMBER_PAGE_KEYS } from '../keys'
import { MemberDashboardPage } from '../Pages/MemberDashboardPage'

export function registerDashboardBindings(container: IContainer): void {
  const k = MEMBER_PAGE_KEYS

  container.singleton(k.dashboard, () => {
    return new MemberDashboardPage()
  })
}
