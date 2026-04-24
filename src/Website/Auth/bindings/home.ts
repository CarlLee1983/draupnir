/**
 * Home page bindings for the Auth module.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { AUTH_PAGE_KEYS } from '../keys'
import { HomePage } from '../Pages/HomePage'

/**
 * Registers the home page singleton.
 *
 * @param container - Application container.
 */
export function registerHomeBindings(container: IContainer): void {
  const k = AUTH_PAGE_KEYS

  container.singleton(k.home, () => new HomePage())
}
