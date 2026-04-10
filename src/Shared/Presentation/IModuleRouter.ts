import type { IHttpContext } from './IHttpContext'
import type { FormRequestClass } from '@gravito/core'

/** Final request handler function, returns an HTTP Response */
export type RouteHandler = (ctx: IHttpContext) => Promise<Response>

/**
 * Middleware function — Onion Model
 * Call next() to continue the pipeline, or return a Response directly to short-circuit.
 */
export type Middleware = (ctx: IHttpContext, next: () => Promise<Response>) => Promise<Response>

/**
 * Interface for module-level HTTP routing.
 */
export interface IModuleRouter {
  // === GET ===
  get(path: string, handler: RouteHandler): void
  get(path: string, middlewares: Middleware[], handler: RouteHandler): void
  get(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  get(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
  ): void

  // === POST ===
  post(path: string, handler: RouteHandler): void
  post(path: string, middlewares: Middleware[], handler: RouteHandler): void
  post(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  post(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
  ): void

  // === PUT ===
  put(path: string, handler: RouteHandler): void
  put(path: string, middlewares: Middleware[], handler: RouteHandler): void
  put(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  put(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
  ): void

  // === PATCH ===
  patch(path: string, handler: RouteHandler): void
  patch(path: string, middlewares: Middleware[], handler: RouteHandler): void
  patch(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  patch(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
  ): void

  // === DELETE ===
  delete(path: string, handler: RouteHandler): void
  delete(path: string, middlewares: Middleware[], handler: RouteHandler): void
  delete(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  delete(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
  ): void

  // === HEAD ===
  head(path: string, handler: RouteHandler): void

  // === OPTIONS ===
  options(path: string, handler: RouteHandler): void

  group(prefix: string, fn: (router: IModuleRouter) => void): void
}
