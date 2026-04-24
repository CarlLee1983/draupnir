/**
 * Routing utility to bind Inertia page actions to route handlers using DI.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * Builds a route handler that resolves an Inertia page from the DI container and dispatches a method.
 *
 * Binding keys are defined in `ADMIN_PAGE_KEYS` / `MEMBER_PAGE_KEYS`; instances are registered as
 * singletons in `registerAdminPageBindings` / `registerMemberPageBindings`.
 *
 * @param container - Application container.
 * @param bindingKey - Page singleton key (e.g. `page.admin.dashboard`).
 * @param action - Method name on the page instance (`handle`, `store`, etc.).
 * @returns Async handler suitable for wrapping with `withInertiaPageHandler`.
 * @throws {Error} When the resolved instance has no callable method named `action`.
 */
export function bindPageAction(
  container: IContainer,
  bindingKey: string,
  action: string,
): (ctx: IHttpContext) => Promise<Response> {
  return (ctx) => {
    const instance = container.make(bindingKey) as Record<
      string,
      ((c: IHttpContext) => Promise<Response>) | undefined
    >
    const method = instance[action]
    if (typeof method !== 'function') {
      throw new Error(`Inertia page binding "${bindingKey}" has no method "${action}"`)
    }
    return method.call(instance, ctx)
  }
}
