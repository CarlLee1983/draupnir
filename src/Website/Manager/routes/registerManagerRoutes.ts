/**
 * Manager Area Routes — 每個路由對應 DI container 中的 page singleton。
 * 個別路由於 Phase F–K 填入。
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type {
  IModuleRouter,
  ModuleRouteOptions,
  RouteHandler,
} from '@/Shared/Presentation/IModuleRouter'

import { bindPageAction } from '@/Website/Http/Routing/bindPageAction'
import { withManagerInertiaPageHandler } from '@/Website/Http/Inertia/withInertiaPage'
import type { ManagerPageBindingKey } from '../keys'
import { MANAGER_PAGE_KEYS } from '../keys'

type InertiaHandler = (ctx: IHttpContext) => Promise<Response>

type ManagerPageInstance = {
  handle(ctx: IHttpContext): Promise<Response>
  store?(ctx: IHttpContext): Promise<Response>
  update?(ctx: IHttpContext): Promise<Response>
  invite?(ctx: IHttpContext): Promise<Response>
  remove?(ctx: IHttpContext): Promise<Response>
  assign?(ctx: IHttpContext): Promise<Response>
  revoke?(ctx: IHttpContext): Promise<Response>
}

export type ManagerRouteDef = {
  readonly method: 'get' | 'post' | 'put'
  readonly path: string
  readonly page: ManagerPageBindingKey
  readonly action: keyof ManagerPageInstance & string
  readonly name?: string
}

/** 路由定義由各 Phase（F–K）填入。 */
const MANAGER_PAGE_ROUTES: readonly ManagerRouteDef[] = [
  {
    method: 'get',
    path: '/manager/dashboard',
    page: MANAGER_PAGE_KEYS.dashboard,
    action: 'handle',
    name: 'pages.manager.dashboard',
  },
  {
    method: 'get',
    path: '/manager/organization',
    page: MANAGER_PAGE_KEYS.organization,
    action: 'handle',
    name: 'pages.manager.organization',
  },
  {
    method: 'put',
    path: '/manager/organization',
    page: MANAGER_PAGE_KEYS.organization,
    action: 'update',
    name: 'pages.manager.organization.update',
  },
  {
    method: 'get',
    path: '/manager/members',
    page: MANAGER_PAGE_KEYS.members,
    action: 'handle',
    name: 'pages.manager.members.index',
  },
  {
    method: 'post',
    path: '/manager/members/invite',
    page: MANAGER_PAGE_KEYS.members,
    action: 'invite',
    name: 'pages.manager.members.invite',
  },
  {
    method: 'post',
    path: '/manager/members/:userId/remove',
    page: MANAGER_PAGE_KEYS.members,
    action: 'remove',
    name: 'pages.manager.members.remove',
  },
  {
    method: 'get',
    path: '/manager/api-keys',
    page: MANAGER_PAGE_KEYS.apiKeys,
    action: 'handle',
    name: 'pages.manager.apiKeys.index',
  },
  {
    method: 'post',
    path: '/manager/api-keys/:keyId/assign',
    page: MANAGER_PAGE_KEYS.apiKeys,
    action: 'assign',
    name: 'pages.manager.apiKeys.assign',
  },
  {
    method: 'post',
    path: '/manager/api-keys/:keyId/revoke',
    page: MANAGER_PAGE_KEYS.apiKeys,
    action: 'revoke',
    name: 'pages.manager.apiKeys.revoke',
  },
]

function registerManagerHttpRoute(
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
 * Registers manager-area Inertia routes (GET/POST/PUT).
 *
 * @param router - Router supporting GET, POST, and PUT.
 * @param container - DI container with manager page bindings.
 */
export function registerManagerRoutes(
  router: Pick<IModuleRouter, 'get' | 'post' | 'put'>,
  container: IContainer,
): void {
  for (const { method, path, page, action, name } of MANAGER_PAGE_ROUTES) {
    const inner = bindPageAction(container, page, action) as InertiaHandler
    const opts = name !== undefined ? { name } : undefined
    registerManagerHttpRoute(router, method, path, withManagerInertiaPageHandler(inner), opts)
  }
}
