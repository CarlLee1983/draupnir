/**
 * Declarative member (org user) Inertia routes: DI page key + action name per row.
 *
 * Instances are registered in `registerMemberPageBindings`; handlers are wrapped with
 * `withInertiaPageHandler` for JWT and shared props.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IModuleRouter, RouteHandler } from '@/Shared/Presentation/IModuleRouter'

import { bindPageAction } from './bindPageAction'
import type { MemberPageBindingKey } from './member/memberPageKeys'
import { MEMBER_PAGE_KEYS } from './member/memberPageKeys'
import { withInertiaPageHandler } from './withInertiaPage'

type InertiaHandler = (ctx: IHttpContext) => Promise<Response>

type MemberPageInstance = {
  handle(ctx: IHttpContext): Promise<Response>
  store?(ctx: IHttpContext): Promise<Response>
  update?(ctx: IHttpContext): Promise<Response>
}

type MemberRouteDef = {
  readonly method: 'get' | 'post' | 'put'
  readonly path: string
  readonly page: MemberPageBindingKey
  readonly action: keyof MemberPageInstance & string
}

const MEMBER_PAGE_ROUTES: readonly MemberRouteDef[] = [
  {
    method: 'get',
    path: '/member/dashboard',
    page: MEMBER_PAGE_KEYS.dashboard,
    action: 'handle',
  },
  {
    method: 'get',
    path: '/member/api-keys',
    page: MEMBER_PAGE_KEYS.apiKeys,
    action: 'handle',
  },
  {
    method: 'get',
    path: '/member/api-keys/create',
    page: MEMBER_PAGE_KEYS.apiKeyCreate,
    action: 'handle',
  },
  {
    method: 'post',
    path: '/member/api-keys',
    page: MEMBER_PAGE_KEYS.apiKeyCreate,
    action: 'store',
  },
  {
    method: 'post',
    path: '/member/api-keys/:keyId/revoke',
    page: MEMBER_PAGE_KEYS.apiKeyRevoke,
    action: 'handle',
  },
  {
    method: 'get',
    path: '/member/usage',
    page: MEMBER_PAGE_KEYS.usage,
    action: 'handle',
  },
  {
    method: 'get',
    path: '/member/contracts',
    page: MEMBER_PAGE_KEYS.contracts,
    action: 'handle',
  },
  {
    method: 'get',
    path: '/member/settings',
    page: MEMBER_PAGE_KEYS.settings,
    action: 'handle',
  },
  {
    method: 'put',
    path: '/member/settings',
    page: MEMBER_PAGE_KEYS.settings,
    action: 'update',
  },
]

function registerMemberHttpRoute(
  router: Pick<IModuleRouter, 'get' | 'post' | 'put'>,
  method: 'get' | 'post' | 'put',
  path: string,
  handler: RouteHandler,
): void {
  if (method === 'get') {
    router.get(path, handler)
  } else if (method === 'post') {
    router.post(path, handler)
  } else {
    router.put(path, handler)
  }
}

/**
 * Registers member-area Inertia routes (GET/POST/PUT).
 *
 * @param router - Router supporting GET, POST, and PUT.
 * @param container - DI container with member page bindings.
 */
export function registerMemberPageRoutes(
  router: Pick<IModuleRouter, 'get' | 'post' | 'put'>,
  container: IContainer,
): void {
  for (const { method, path, page, action } of MEMBER_PAGE_ROUTES) {
    const inner = bindPageAction(container, page, action) as InertiaHandler
    registerMemberHttpRoute(router, method, path, withInertiaPageHandler(inner))
  }
}
