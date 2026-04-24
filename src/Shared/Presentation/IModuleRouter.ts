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

  /**
   * Registers a GET route.
   *
   * @param path - URL pattern.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  get(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void
  /**
   * Registers a GET route with middleware.
   *
   * @param path - URL pattern.
   * @param middlewares - Sequential middleware pipeline.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  get(
    path: string,
    middlewares: Middleware[],
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  /**
   * Registers a GET route with a FormRequest validator.
   *
   * @param path - URL pattern.
   * @param formRequest - Gravito FormRequest validator class.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  get(
    path: string,
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  /**
   * Registers a GET route with middleware and a FormRequest validator.
   *
   * @param path - URL pattern.
   * @param middlewares - Sequential middleware pipeline.
   * @param formRequest - Gravito FormRequest validator class.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  get(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void

  // === POST ===

  /**
   * Registers a POST route.
   *
   * @param path - URL pattern.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  post(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void
  /**
   * Registers a POST route with middleware.
   *
   * @param path - URL pattern.
   * @param middlewares - Sequential middleware pipeline.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  post(
    path: string,
    middlewares: Middleware[],
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  /**
   * Registers a POST route with a FormRequest validator.
   *
   * @param path - URL pattern.
   * @param formRequest - Gravito FormRequest validator class.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  post(
    path: string,
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  /**
   * Registers a POST route with middleware and a FormRequest validator.
   *
   * @param path - URL pattern.
   * @param middlewares - Sequential middleware pipeline.
   * @param formRequest - Gravito FormRequest validator class.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  post(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void

  // === PUT ===

  /**
   * Registers a PUT route.
   *
   * @param path - URL pattern.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  put(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void
  /**
   * Registers a PUT route with middleware.
   *
   * @param path - URL pattern.
   * @param middlewares - Sequential middleware pipeline.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  put(
    path: string,
    middlewares: Middleware[],
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  /**
   * Registers a PUT route with a FormRequest validator.
   *
   * @param path - URL pattern.
   * @param formRequest - Gravito FormRequest validator class.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  put(
    path: string,
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  /**
   * Registers a PUT route with middleware and a FormRequest validator.
   *
   * @param path - URL pattern.
   * @param middlewares - Sequential middleware pipeline.
   * @param formRequest - Gravito FormRequest validator class.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  put(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void

  // === PATCH ===

  /**
   * Registers a PATCH route.
   *
   * @param path - URL pattern.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  patch(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void
  /**
   * Registers a PATCH route with middleware.
   *
   * @param path - URL pattern.
   * @param middlewares - Sequential middleware pipeline.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  patch(
    path: string,
    middlewares: Middleware[],
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  /**
   * Registers a PATCH route with a FormRequest validator.
   *
   * @param path - URL pattern.
   * @param formRequest - Gravito FormRequest validator class.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  patch(
    path: string,
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  /**
   * Registers a PATCH route with middleware and a FormRequest validator.
   *
   * @param path - URL pattern.
   * @param middlewares - Sequential middleware pipeline.
   * @param formRequest - Gravito FormRequest validator class.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  patch(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void

  // === DELETE ===

  /**
   * Registers a DELETE route.
   *
   * @param path - URL pattern.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  delete(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void
  /**
   * Registers a DELETE route with middleware.
   *
   * @param path - URL pattern.
   * @param middlewares - Sequential middleware pipeline.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  delete(
    path: string,
    middlewares: Middleware[],
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  /**
   * Registers a DELETE route with a FormRequest validator.
   *
   * @param path - URL pattern.
   * @param formRequest - Gravito FormRequest validator class.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  delete(
    path: string,
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void
  /**
   * Registers a DELETE route with middleware and a FormRequest validator.
   *
   * @param path - URL pattern.
   * @param middlewares - Sequential middleware pipeline.
   * @param formRequest - Gravito FormRequest validator class.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  delete(
    path: string,
    middlewares: Middleware[],
    formRequest: FormRequestClass,
    handler: RouteHandler,
    options?: ModuleRouteOptions,
  ): void

  // === HEAD ===

  /**
   * Registers a HEAD route.
   *
   * @param path - URL pattern.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  head(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void

  // === OPTIONS ===

  /**
   * Registers an OPTIONS route.
   *
   * @param path - URL pattern.
   * @param handler - Final request handler.
   * @param options - Registration options.
   */
  options(path: string, handler: RouteHandler, options?: ModuleRouteOptions): void

  /**
   * Groups routes under a common prefix.
   *
   * @param prefix - The path prefix.
   * @param fn - A callback that receives a scoped router instance.
   */
  group(prefix: string, fn: (router: IModuleRouter) => void): void
}
