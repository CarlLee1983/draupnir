import type { FormRequestClass } from '@gravito/core'
import type { IHttpContext } from './IHttpContext'

/** Final request handler function, returns an HTTP Response */
export type RouteHandler = (ctx: IHttpContext) => Promise<Response>

/**
 * Middleware function — Onion Model
 * Call next() to continue the pipeline, or return a Response directly to short-circuit.
 */
export type Middleware = (ctx: IHttpContext, next: () => Promise<Response>) => Promise<Response>

/**
 * Optional metadata when registering a route (framework-agnostic).
 * Adapters map `name` to engine-specific named routes (e.g. Gravito `Route.name()`).
 */
export type ModuleRouteOptions = {
  /** Stable route identifier for URL generation, `route:list`, logging, docs. */
  readonly name?: string
}

/**
 * Interface for module-level HTTP routing.
 */
export interface IModuleRouter {
  // === GET ===
  get(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void
  get(
    path: string,
    middlewares: Middleware[],
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  get(
    path: string,
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  get(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void

  // === POST ===
  post(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void
  post(
    path: string,
    middlewares: Middleware[],
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  post(
    path: string,
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  post(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void

  // === PUT ===
  put(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void
  put(
    path: string,
    middlewares: Middleware[],
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  put(
    path: string,
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  put(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void

  // === PATCH ===
  patch(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void
  patch(
    path: string,
    middlewares: Middleware[],
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  patch(
    path: string,
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  patch(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void

  // === DELETE ===
  delete(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void
  delete(
    path: string,
    middlewares: Middleware[],
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  delete(
    path: string,
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  delete(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void

  // === HEAD ===
  head(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void

  // === OPTIONS ===
  options(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void

  group(prefix: string, fn: (router: IModuleRouter) => void): void
}
