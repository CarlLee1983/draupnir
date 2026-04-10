/**
 * Declarative admin Inertia routes: each row maps HTTP method/path to a DI page key and instance method.
 *
 * Page classes are **not** constructed here; `bindPageAction` resolves singletons registered in
 * `registerAdminPageBindings`. Static paths must appear before dynamic `/:id` segments.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IModuleRouter, RouteHandler } from '@/Shared/Presentation/IModuleRouter'

import type { AdminPageBindingKey } from './admin/adminPageKeys'
import { ADMIN_PAGE_KEYS } from './admin/adminPageKeys'
import { bindPageAction } from './bindPageAction'
import { withInertiaPageHandler } from './withInertiaPage'

type InertiaHandler = (ctx: IHttpContext) => Promise<Response>

type AdminRouteDef = {
  readonly method: 'get' | 'post'
  readonly path: string
  /** Container binding key (see `registerAdminPageBindings`). */
  readonly page: AdminPageBindingKey
  /** Instance method name on the page class. */
  readonly action: keyof AdminPageInstance & string
}

/** Minimal shape for `bindPageAction` typing; each admin page exposes these method names. */
type AdminPageInstance = {
  handle(ctx: IHttpContext): Promise<Response>
  store?(ctx: IHttpContext): Promise<Response>
  postStatus?(ctx: IHttpContext): Promise<Response>
  postAction?(ctx: IHttpContext): Promise<Response>
}

/**
 * Declarative admin routes only: method, path, DI binding key, action name.
 * Order matters: static paths before `/:id` segments.
 */
const ADMIN_PAGE_ROUTES: readonly AdminRouteDef[] = [
  { method: 'get', path: '/admin/dashboard', page: ADMIN_PAGE_KEYS.dashboard, action: 'handle' },
  { method: 'get', path: '/admin/users', page: ADMIN_PAGE_KEYS.users, action: 'handle' },
  { method: 'get', path: '/admin/users/:id', page: ADMIN_PAGE_KEYS.userDetail, action: 'handle' },
  {
    method: 'post',
    path: '/admin/users/:id/status',
    page: ADMIN_PAGE_KEYS.userDetail,
    action: 'postStatus',
  },
  {
    method: 'get',
    path: '/admin/organizations',
    page: ADMIN_PAGE_KEYS.organizations,
    action: 'handle',
  },
  {
    method: 'get',
    path: '/admin/organizations/:id',
    page: ADMIN_PAGE_KEYS.organizationDetail,
    action: 'handle',
  },
  { method: 'get', path: '/admin/contracts', page: ADMIN_PAGE_KEYS.contracts, action: 'handle' },
  {
    method: 'get',
    path: '/admin/contracts/create',
    page: ADMIN_PAGE_KEYS.contractCreate,
    action: 'handle',
  },
  {
    method: 'post',
    path: '/admin/contracts',
    page: ADMIN_PAGE_KEYS.contractCreate,
    action: 'store',
  },
  {
    method: 'get',
    path: '/admin/contracts/:id',
    page: ADMIN_PAGE_KEYS.contractDetail,
    action: 'handle',
  },
  {
    method: 'post',
    path: '/admin/contracts/:id/action',
    page: ADMIN_PAGE_KEYS.contractDetail,
    action: 'postAction',
  },
  { method: 'get', path: '/admin/modules', page: ADMIN_PAGE_KEYS.modules, action: 'handle' },
  {
    method: 'get',
    path: '/admin/modules/create',
    page: ADMIN_PAGE_KEYS.moduleCreate,
    action: 'handle',
  },
  {
    method: 'post',
    path: '/admin/modules',
    page: ADMIN_PAGE_KEYS.moduleCreate,
    action: 'store',
  },
  { method: 'get', path: '/admin/api-keys', page: ADMIN_PAGE_KEYS.apiKeys, action: 'handle' },
  {
    method: 'get',
    path: '/admin/usage-sync',
    page: ADMIN_PAGE_KEYS.usageSync,
    action: 'handle',
  },
]

function registerAdminHttpRoute(
  router: Pick<IModuleRouter, 'get' | 'post'>,
  method: 'get' | 'post',
  path: string,
  handler: RouteHandler,
): void {
  if (method === 'get') {
    router.get(path, handler)
  } else {
    router.post(path, handler)
  }
}

/**
 * Registers all admin area Inertia routes on the module router.
 *
 * @param router - Router supporting GET/POST.
 * @param container - DI container with admin page bindings.
 */
export function registerAdminPageRoutes(
  router: Pick<IModuleRouter, 'get' | 'post'>,
  container: IContainer,
): void {
  for (const { method, path, page, action } of ADMIN_PAGE_ROUTES) {
    const inner = bindPageAction(container, page, action) as InertiaHandler
    registerAdminHttpRoute(router, method, path, withInertiaPageHandler(inner))
  }
}
