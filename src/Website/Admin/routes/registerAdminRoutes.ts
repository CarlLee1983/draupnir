/**
 * Declarative admin Inertia routes: each row maps HTTP method/path to a DI page key and instance method.
 *
 * Page classes are **not** constructed here; `bindPageAction` resolves singletons registered in
 * `registerAdminPageBindings`. Static paths must appear before dynamic `/:id` segments.
 */
import type { FormRequestClass } from '@gravito/core'
import { RegisterModuleRequest } from '@/Modules/AppModule/Presentation/Requests/RegisterModuleRequest'
import { CreateContractRequest } from '@/Modules/Contract/Presentation/Requests/CreateContractRequest'
import { ChangeStatusRequest } from '@/Modules/Profile/Presentation/Requests/ChangeStatusRequest'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type {
  IModuleRouter,
  ModuleRouteOptions,
  RouteHandler,
} from '@/Shared/Presentation/IModuleRouter'
import {
  withAdminInertiaPageHandler,
  withInertiaPageHandler,
} from '@/Website/Http/Inertia/withInertiaPage'
import { bindPageAction } from '@/Website/Http/Routing/bindPageAction'
import type { AdminPageBindingKey } from '../keys'
import { ADMIN_PAGE_KEYS } from '../keys'

type InertiaHandler = (ctx: IHttpContext) => Promise<Response>

type AdminPageInstance = {
  handle(ctx: IHttpContext): Promise<Response>
  store?(ctx: IHttpContext): Promise<Response>
  update?(ctx: IHttpContext): Promise<Response>
  postStatus?(ctx: IHttpContext): Promise<Response>
  postAction?(ctx: IHttpContext): Promise<Response>
  postQuota?(ctx: IHttpContext): Promise<Response>
}

export type AdminRouteDef = {
  readonly method: 'get' | 'post' | 'put'
  readonly path: string
  readonly page: AdminPageBindingKey
  readonly action: keyof AdminPageInstance & string
  readonly name?: string
  readonly formRequest?: FormRequestClass
  readonly publicPage?: boolean
}

/**
 * Declarative admin routes only: method, path, DI binding key, action name.
 * Order matters: static paths before `/:id` segments.
 */
const ADMIN_PAGE_ROUTES: readonly AdminRouteDef[] = [
  {
    method: 'get',
    path: '/admin/dashboard',
    page: ADMIN_PAGE_KEYS.dashboard,
    action: 'handle',
    name: 'pages.admin.dashboard',
  },
  {
    method: 'get',
    path: '/admin/users',
    page: ADMIN_PAGE_KEYS.users,
    action: 'handle',
    name: 'pages.admin.users.index',
  },
  {
    method: 'get',
    path: '/admin/users/:id',
    page: ADMIN_PAGE_KEYS.userDetail,
    action: 'handle',
    name: 'pages.admin.users.show',
  },
  {
    method: 'post',
    path: '/admin/users/:id/status',
    page: ADMIN_PAGE_KEYS.userDetail,
    action: 'postStatus',
    formRequest: ChangeStatusRequest,
    name: 'pages.admin.users.status',
  },
  {
    method: 'get',
    path: '/admin/organizations',
    page: ADMIN_PAGE_KEYS.organizations,
    action: 'handle',
    name: 'pages.admin.organizations.index',
  },
  {
    method: 'get',
    path: '/admin/organizations/:id',
    page: ADMIN_PAGE_KEYS.organizationDetail,
    action: 'handle',
    name: 'pages.admin.organizations.show',
  },
  {
    method: 'get',
    path: '/admin/contracts',
    page: ADMIN_PAGE_KEYS.contracts,
    action: 'handle',
    name: 'pages.admin.contracts.index',
  },
  {
    method: 'get',
    path: '/admin/contracts/create',
    page: ADMIN_PAGE_KEYS.contractCreate,
    action: 'handle',
    name: 'pages.admin.contracts.create',
  },
  {
    method: 'post',
    path: '/admin/contracts',
    page: ADMIN_PAGE_KEYS.contractCreate,
    action: 'store',
    formRequest: CreateContractRequest,
    name: 'pages.admin.contracts.store',
  },
  {
    method: 'get',
    path: '/admin/contracts/:id',
    page: ADMIN_PAGE_KEYS.contractDetail,
    action: 'handle',
    name: 'pages.admin.contracts.show',
  },
  {
    method: 'post',
    path: '/admin/contracts/:id/action',
    page: ADMIN_PAGE_KEYS.contractDetail,
    action: 'postAction',
    name: 'pages.admin.contracts.action',
  },
  {
    method: 'post',
    path: '/admin/contracts/:id/quota',
    page: ADMIN_PAGE_KEYS.contractDetail,
    action: 'postQuota',
    name: 'pages.admin.contracts.quota',
  },
  {
    method: 'get',
    path: '/admin/modules',
    page: ADMIN_PAGE_KEYS.modules,
    action: 'handle',
    name: 'pages.admin.modules.index',
  },
  {
    method: 'get',
    path: '/admin/modules/create',
    page: ADMIN_PAGE_KEYS.moduleCreate,
    action: 'handle',
    name: 'pages.admin.modules.create',
  },
  {
    method: 'post',
    path: '/admin/modules',
    page: ADMIN_PAGE_KEYS.moduleCreate,
    action: 'store',
    formRequest: RegisterModuleRequest,
    name: 'pages.admin.modules.store',
  },
  {
    method: 'get',
    path: '/admin/api-keys',
    page: ADMIN_PAGE_KEYS.apiKeys,
    action: 'handle',
    name: 'pages.admin.apiKeys',
  },
  {
    method: 'get',
    path: '/admin/usage-sync',
    page: ADMIN_PAGE_KEYS.usageSync,
    action: 'handle',
    name: 'pages.admin.usageSync',
  },
  {
    method: 'get',
    path: '/admin/org/:orgId/reports',
    page: ADMIN_PAGE_KEYS.reports,
    action: 'handle',
    name: 'pages.admin.reports',
  },
  {
    method: 'get',
    path: '/admin/reports/template',
    page: ADMIN_PAGE_KEYS.reportTemplate,
    action: 'handle',
    name: 'pages.admin.reports.template',
    publicPage: true,
  },
]

function registerAdminHttpRoute(
  router: Pick<IModuleRouter, 'get' | 'post' | 'put'>,
  method: 'get' | 'post' | 'put',
  path: string,
  handler: RouteHandler,
  routeOptions?: ModuleRouteOptions,
  formRequest?: FormRequestClass,
): void {
  if (method === 'get') {
    router.get(path, handler, routeOptions)
  } else if (method === 'post') {
    if (formRequest) {
      router.post(path, formRequest, handler, routeOptions)
    } else {
      router.post(path, handler, routeOptions)
    }
  } else if (formRequest) {
    router.put(path, formRequest, handler, routeOptions)
  } else {
    router.put(path, handler, routeOptions)
  }
}

/**
 * Registers all admin area Inertia routes on the module router.
 *
 * @param router - Router supporting GET/POST/PUT.
 * @param container - DI container with admin page bindings.
 */
export function registerAdminRoutes(
  router: Pick<IModuleRouter, 'get' | 'post' | 'put'>,
  container: IContainer,
): void {
  for (const { method, path, page, action, name, formRequest, publicPage } of ADMIN_PAGE_ROUTES) {
    const inner = bindPageAction(container, page, action) as InertiaHandler
    const opts = name !== undefined ? { name } : undefined
    registerAdminHttpRoute(
      router,
      method,
      path,
      publicPage ? withInertiaPageHandler(inner) : withAdminInertiaPageHandler(inner),
      opts,
      formRequest,
    )
  }
}
