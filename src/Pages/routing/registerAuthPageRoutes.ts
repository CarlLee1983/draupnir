/**
 * Declarative auth Inertia routes.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IModuleRouter, RouteHandler } from '@/Shared/Presentation/IModuleRouter'

import { AUTH_PAGE_KEYS } from './auth/authPageKeys'
import { bindPageAction } from './bindPageAction'
import { withInertiaPageHandler } from './withInertiaPage'

type InertiaHandler = (ctx: IHttpContext) => Promise<Response>

type AuthPageInstance = {
  handle(ctx: IHttpContext): Promise<Response>
  store?(ctx: IHttpContext): Promise<Response>
}

type AuthRouteDef = {
  readonly method: 'get' | 'post'
  readonly path: string
  readonly page: (typeof AUTH_PAGE_KEYS)[keyof typeof AUTH_PAGE_KEYS]
  readonly action: keyof AuthPageInstance & string
}

const AUTH_PAGE_ROUTES: readonly AuthRouteDef[] = [
  { method: 'get', path: '/login', page: AUTH_PAGE_KEYS.login, action: 'handle' },
  { method: 'post', path: '/login', page: AUTH_PAGE_KEYS.login, action: 'store' },
  { method: 'get', path: '/register', page: AUTH_PAGE_KEYS.register, action: 'handle' },
  { method: 'post', path: '/register', page: AUTH_PAGE_KEYS.register, action: 'store' },
  {
    method: 'get',
    path: '/forgot-password',
    page: AUTH_PAGE_KEYS.forgotPassword,
    action: 'handle',
  },
  {
    method: 'post',
    path: '/forgot-password',
    page: AUTH_PAGE_KEYS.forgotPassword,
    action: 'store',
  },
  {
    method: 'get',
    path: '/reset-password/:token',
    page: AUTH_PAGE_KEYS.resetPassword,
    action: 'handle',
  },
  {
    method: 'post',
    path: '/reset-password/:token',
    page: AUTH_PAGE_KEYS.resetPassword,
    action: 'store',
  },
  {
    method: 'get',
    path: '/verify-email/:token',
    page: AUTH_PAGE_KEYS.emailVerification,
    action: 'handle',
  },
  {
    method: 'get',
    path: '/oauth/google/callback',
    page: AUTH_PAGE_KEYS.googleOAuthCallback,
    action: 'handle',
  },
]

function registerAuthHttpRoute(
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
 * Registers auth area Inertia routes on the module router.
 */
export function registerAuthPageRoutes(
  router: Pick<IModuleRouter, 'get' | 'post'>,
  container: IContainer,
): void {
  for (const { method, path, page, action } of AUTH_PAGE_ROUTES) {
    const inner = bindPageAction(container, page, action) as InertiaHandler
    registerAuthHttpRoute(router, method, path, withInertiaPageHandler(inner))
  }
}
