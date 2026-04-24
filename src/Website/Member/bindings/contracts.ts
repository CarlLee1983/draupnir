import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MEMBER_PAGE_KEYS } from '../keys'
import { MemberContractsPage } from '../Pages/MemberContractsPage'

export function registerContractsBindings(container: IContainer): void {
  const k = MEMBER_PAGE_KEYS

  container.singleton(k.contracts, () => new MemberContractsPage())
}
