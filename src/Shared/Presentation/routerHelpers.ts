import type { Middleware, RouteHandler } from './IModuleRouter'

/**
 * Composes multiple middlewares into a single middleware.
 *
 * @example
 * const secured = compose(rateLimiter, jwtGuard, auditLog)
 * router.get('/admin/data', [secured], getAdminData)
 */
export function compose(...middlewares: Middleware[]): Middleware {
  return (ctx, next) => {
    let index = -1
    const dispatch = (i: number): Promise<Response> => {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'))
      }
      index = i
      if (i === middlewares.length) {
        return next()
      }
      return middlewares[i](ctx, () => dispatch(i + 1))
    }
    return dispatch(0)
  }
}

/**
 * Wraps middlewares into a RouteHandler decorator.
 * Useful for creating "protected" versions of handlers.
 *
 * @example
 * const protectedHandler = withGuard(jwtGuard)(getProfile)
 * router.get('/users/me', protectedHandler)
 */
export function withGuard(...middlewares: Middleware[]): (handler: RouteHandler) => RouteHandler {
  return (handler) => {
    const composed = compose(...middlewares)
    return (ctx) => composed(ctx, () => handler(ctx))
  }
}

