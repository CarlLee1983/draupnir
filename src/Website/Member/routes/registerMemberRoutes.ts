/**
 * Member Area Routes
 *
 * Registers the declarative routing for the member portal. Each route maps a path
 * to a DI container key and a specific page class action. Handlers are automatically
 * wrapped with Inertia middleware to handle authentication and shared state.
 */

import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type {
  IModuleRouter,
  ModuleRouteOptions,
  RouteHandler,
} from '@/Shared/Presentation/IModuleRouter'

import { bindPageAction } from '@/Website/Http/Routing/bindPageAction'
import type { MemberPageBindingKey } from '../keys'
import { MEMBER_PAGE_KEYS } from '../keys'
import { withMemberInertiaPageHandler } from '@/Website/Http/Inertia/withInertiaPage'

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
  readonly name?: string
}

const MEMBER_PAGE_ROUTES: readonly MemberRouteDef[] = [
  {
    method: 'get',
    path: '/member/dashboard',
    page: MEMBER_PAGE_KEYS.dashboard,
    action: 'handle',
    name: 'pages.member.dashboard',
  },
  {
    method: 'get',
    path: '/member/api-keys',
    page: MEMBER_PAGE_KEYS.apiKeys,
    action: 'handle',
    name: 'pages.member.apiKeys.index',
  },
  {
    method: 'get',
    path: '/member/api-keys/create',
    page: MEMBER_PAGE_KEYS.apiKeyCreate,
    action: 'handle',
    name: 'pages.member.apiKeys.create',
  },
  {
    method: 'post',
    path: '/member/api-keys',
    page: MEMBER_PAGE_KEYS.apiKeyCreate,
    action: 'store',
    name: 'pages.member.apiKeys.store',
  },
  {
    method: 'get',
    path: '/member/api-keys/:keyId/budget',
    page: MEMBER_PAGE_KEYS.apiKeyBudget,
    action: 'handle',
    name: 'pages.member.apiKeys.budget',
  },
  {
    method: 'post',
    path: '/member/api-keys/:keyId/budget',
    page: MEMBER_PAGE_KEYS.apiKeyBudget,
    action: 'store',
    name: 'pages.member.apiKeys.budget.update',
  },
  {
    method: 'post',
    path: '/member/api-keys/:keyId/revoke',
    page: MEMBER_PAGE_KEYS.apiKeyRevoke,
    action: 'handle',
    name: 'pages.member.apiKeys.revoke',
  },
  {
    method: 'get',
    path: '/member/usage',
    page: MEMBER_PAGE_KEYS.usage,
    action: 'handle',
    name: 'pages.member.usage',
  },
  {
    method: 'get',
    path: '/member/cost-breakdown',
    page: MEMBER_PAGE_KEYS.costBreakdown,
    action: 'handle',
    name: 'pages.member.costBreakdown',
  },
  {
    method: 'get',
    path: '/member/contracts',
    page: MEMBER_PAGE_KEYS.contracts,
    action: 'handle',
    name: 'pages.member.contracts',
  },
  {
    method: 'get',
    path: '/member/settings',
    page: MEMBER_PAGE_KEYS.settings,
    action: 'handle',
    name: 'pages.member.settings',
  },
  {
    method: 'put',
    path: '/member/settings',
    page: MEMBER_PAGE_KEYS.settings,
    action: 'update',
    name: 'pages.member.settings.update',
  },
]

function registerMemberHttpRoute(
  router: Pick<IModuleRouter, 'get' | 'post' | 'put'>,
  method: 'get' | 'post' | 'put',
  path: string,
  handler: RouteHandler,
  routeOptions?: ModuleRouteOptions,
): void {
  if (method === 'get') {
    router.get(path, handler, routeOptions)
  } else if (method === 'post') {
    router.post(path, handler, routeOptions)
  } else {
    router.put(path, handler, routeOptions)
  }
}

/**
 * Registers member-area Inertia routes (GET/POST/PUT).
 *
 * @param router - Router supporting GET, POST, and PUT.
 * @param container - DI container with member page bindings.
 */
export function registerMemberRoutes(
  router: Pick<IModuleRouter, 'get' | 'post' | 'put'>,
  container: IContainer,
): void {
  for (const { method, path, page, action, name } of MEMBER_PAGE_ROUTES) {
    const inner = bindPageAction(container, page, action) as InertiaHandler
    const opts = name !== undefined ? { name } : undefined
    registerMemberHttpRoute(router, method, path, withMemberInertiaPageHandler(inner), opts)
  }

  const alertsHandler = bindPageAction(
    container,
    MEMBER_PAGE_KEYS.ALERTS,
    'handle',
  ) as InertiaHandler
  // No org middleware here — requireOrganizationManager() returns plain JSON (no X-Inertia header)
  // which breaks Inertia navigation. The page handler itself handles missing-orgId gracefully.
  router.get(
    '/member/alerts',
    withMemberInertiaPageHandler(alertsHandler),
    { name: 'pages.member.alerts' },
  )
}
