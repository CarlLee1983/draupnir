import type { IHttpContext } from './IHttpContext'
import type { FormRequestClass } from '@gravito/core'

/** 最終請求處理函式，回傳 HTTP Response */
export type RouteHandler = (ctx: IHttpContext) => Promise<Response>

/**
 * 中間件函式 — 洋蔥模型（Onion Model）
 * 呼叫 next() 繼續管線，或直接回傳 Response 短路
 */
export type Middleware = (
  ctx: IHttpContext,
  next: () => Promise<Response>,
) => Promise<Response>

export interface IModuleRouter {
  // === GET ===
  get(path: string, handler: RouteHandler): void
  get(path: string, middlewares: Middleware[], handler: RouteHandler): void
  get(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  get(path: string, middlewares: Middleware[], formRequest: FormRequestClass, handler: RouteHandler): void

  // === POST ===
  post(path: string, handler: RouteHandler): void
  post(path: string, middlewares: Middleware[], handler: RouteHandler): void
  post(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  post(path: string, middlewares: Middleware[], formRequest: FormRequestClass, handler: RouteHandler): void

  // === PUT ===
  put(path: string, handler: RouteHandler): void
  put(path: string, middlewares: Middleware[], handler: RouteHandler): void
  put(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  put(path: string, middlewares: Middleware[], formRequest: FormRequestClass, handler: RouteHandler): void

  // === PATCH ===
  patch(path: string, handler: RouteHandler): void
  patch(path: string, middlewares: Middleware[], handler: RouteHandler): void
  patch(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  patch(path: string, middlewares: Middleware[], formRequest: FormRequestClass, handler: RouteHandler): void

  // === DELETE ===
  delete(path: string, handler: RouteHandler): void
  delete(path: string, middlewares: Middleware[], handler: RouteHandler): void
  delete(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  delete(path: string, middlewares: Middleware[], formRequest: FormRequestClass, handler: RouteHandler): void

  // === HEAD ===
  head(path: string, handler: RouteHandler): void

  // === OPTIONS ===
  options(path: string, handler: RouteHandler): void

  group(prefix: string, fn: (router: IModuleRouter) => void): void
}
