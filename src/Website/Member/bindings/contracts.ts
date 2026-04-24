/**
 * Contracts page bindings for the Member module.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MEMBER_PAGE_KEYS } from '../keys'
import { MemberContractsPage } from '../Pages/MemberContractsPage'

/**
 * Registers the member contracts page in the DI container.
 *
 * @param container - Application container.
 */
export function registerContractsBindings(container: IContainer): void {
  const k = MEMBER_PAGE_KEYS

  container.singleton(k.contracts, () => new MemberContractsPage())
}
