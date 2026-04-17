/**
 * Declarative auth Inertia routes.
 *
 * This module defines the mapping between URL paths and Auth Inertia page classes
 * using a declarative routing table. Each route is resolved via the DI container
 * using bindPageAction to ensure proper dependency injection for page controllers.
 */

import type { FormRequestClass } from '@gravito/core'
import { ForgotPasswordRequest } from '@/Modules/Auth/Presentation/Requests/ForgotPasswordRequest'
import { LoginRequest } from '@/Modules/Auth/Presentation/Requests/LoginRequest'
import { RegisterRequest } from '@/Modules/Auth/Presentation/Requests/RegisterRequest'
import { ResetPasswordRequest } from '@/Modules/Auth/Presentation/Requests/ResetPasswordRequest'
import { VerifyDeviceRequest } from '@/Modules/Auth/Presentation/Requests/VerifyDeviceRequest'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type {
  IModuleRouter,
  Middleware,
  ModuleRouteOptions,
  RouteHandler,
} from '@/Shared/Presentation/IModuleRouter'
import { createInMemoryRateLimit } from '@/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware'

import { AUTH_PAGE_KEYS } from '../keys'
import { bindPageAction } from '@/Website/Http/Routing/bindPageAction'
import { withInertiaPageHandler } from '@/Website/Http/Inertia/withInertiaPage'

type InertiaHandler = (ctx: IHttpContext) => Promise<Response>

type AuthPageInstance = {
  handle(ctx: IHttpContext): Promise<Response>
  store?(ctx: IHttpContext): Promise<Response>
  authorize?(ctx: IHttpContext): Promise<Response>
}

type AuthRouteDef = {
  readonly method: 'get' | 'post'
  readonly path: string
  readonly page: (typeof AUTH_PAGE_KEYS)[keyof typeof AUTH_PAGE_KEYS]
  readonly action: keyof AuthPageInstance & string
  readonly formRequest?: FormRequestClass
  readonly middlewares?: Middleware[]
  readonly name?: string
}

const loginRateLimit = createInMemoryRateLimit({ scope: 'auth:login', max: 10, windowMs: 10 * 60 * 1000 })
const forgotPasswordRateLimit = createInMemoryRateLimit({ scope: 'auth:forgot', max: 5, windowMs: 60 * 60 * 1000 })

const AUTH_PAGE_ROUTES: readonly AuthRouteDef[] = [
  {
    method: 'get',
    path: '/',
    page: AUTH_PAGE_KEYS.home,
    action: 'handle',
    name: 'pages.home',
  },
  {
    method: 'get',
    path: '/login',
    page: AUTH_PAGE_KEYS.login,
    action: 'handle',
    name: 'pages.auth.login',
  },
  {
    method: 'post',
    path: '/login',
    page: AUTH_PAGE_KEYS.login,
    action: 'store',
    formRequest: LoginRequest,
    middlewares: [loginRateLimit],
    name: 'pages.auth.login.submit',
  },
  {
    method: 'get',
    path: '/register',
    page: AUTH_PAGE_KEYS.register,
    action: 'handle',
    name: 'pages.auth.register',
  },
  {
    method: 'post',
    path: '/register',
    page: AUTH_PAGE_KEYS.register,
    action: 'store',
    formRequest: RegisterRequest,
    middlewares: [loginRateLimit],
    name: 'pages.auth.register.submit',
  },
  {
    method: 'get',
    path: '/forgot-password',
    page: AUTH_PAGE_KEYS.forgotPassword,
    action: 'handle',
    name: 'pages.auth.password.request',
  },
  {
    method: 'post',
    path: '/forgot-password',
    page: AUTH_PAGE_KEYS.forgotPassword,
    action: 'store',
    formRequest: ForgotPasswordRequest,
    middlewares: [forgotPasswordRateLimit],
    name: 'pages.auth.password.email',
  },
  {
    method: 'get',
    path: '/reset-password/:token',
    page: AUTH_PAGE_KEYS.resetPassword,
    action: 'handle',
    name: 'pages.auth.password.reset',
  },
  {
    method: 'post',
    path: '/reset-password/:token',
    page: AUTH_PAGE_KEYS.resetPassword,
    action: 'store',
    formRequest: ResetPasswordRequest,
    name: 'pages.auth.password.update',
  },
  {
    method: 'get',
    path: '/verify-email/:token',
    page: AUTH_PAGE_KEYS.emailVerification,
    action: 'handle',
    name: 'pages.auth.verifyEmail',
  },
  {
    method: 'get',
    path: '/oauth/google/callback',
    page: AUTH_PAGE_KEYS.googleOAuthCallback,
    action: 'handle',
    name: 'pages.auth.oauth.google.callback',
  },
  {
    method: 'get',
    path: '/verify-device',
    page: AUTH_PAGE_KEYS.verifyDevice,
    action: 'handle',
    name: 'pages.auth.device.verify',
  },
  {
    method: 'post',
    path: '/verify-device',
    page: AUTH_PAGE_KEYS.verifyDevice,
    action: 'authorize',
    formRequest: VerifyDeviceRequest,
    name: 'pages.auth.device.authorize',
  },
  {
    method: 'post',
    path: '/logout',
    page: AUTH_PAGE_KEYS.logout,
    action: 'store',
    name: 'pages.auth.logout',
  },
]

function registerAuthHttpRoute(
  router: Pick<IModuleRouter, 'get' | 'post'>,
  method: 'get' | 'post',
  path: string,
  handler: RouteHandler,
  formRequest?: FormRequestClass,
  middlewares?: Middleware[],
  routeOptions?: ModuleRouteOptions,
): void {
  if (method === 'get') {
    router.get(path, handler, routeOptions)
  } else if (middlewares && middlewares.length > 0 && formRequest) {
    router.post(path, middlewares, formRequest, handler, routeOptions)
  } else if (middlewares && middlewares.length > 0) {
    router.post(path, middlewares, handler, routeOptions)
  } else if (formRequest) {
    router.post(path, formRequest, handler, routeOptions)
  } else {
    router.post(path, handler, routeOptions)
  }
}

/**
 * Registers auth area Inertia routes on the module router.
 */
export function registerAuthRoutes(
  router: Pick<IModuleRouter, 'get' | 'post'>,
  container: IContainer,
): void {
  for (const { method, path, page, action, formRequest, middlewares, name } of AUTH_PAGE_ROUTES) {
    const inner = bindPageAction(container, page, action) as InertiaHandler
    const opts = name !== undefined ? { name } : undefined
    registerAuthHttpRoute(router, method, path, withInertiaPageHandler(inner), formRequest, middlewares, opts)
  }
}
