import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { Middleware, RouteHandler } from '@/Shared/Presentation/IModuleRouter'
import { HttpKernel } from '../HttpKernel'

/**
 * 將 middleware 陣列 + handler 組合成 RouteHandler（onion model）。
 *
 * 執行順序：middlewares[0] → middlewares[1] → ... → handler
 * 每個 middleware 可在 next() 前後執行代碼（before/after hook）。
 *
 * Exported for testing.
 */
export function composePageHandler(
  middlewares: Middleware[],
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  return (ctx) => {
    const run = (i: number): Promise<Response> =>
      i >= middlewares.length ? handler(ctx) : middlewares[i]!(ctx, () => run(i + 1))
    return run(0)
  }
}

/**
 * 公開頁面 wrapper（login、register 等）。
 * Chain：attachJwt → attachWebCsrf → injectSharedData → applyPendingCookies → handler
 */
export function withInertiaPageHandler(
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  return composePageHandler(HttpKernel.groups.web(), handler)
}

/**
 * Admin 區域 wrapper。
 * Chain：attachJwt → attachWebCsrf → injectSharedData → requireAdmin → applyPendingCookies → handler
 */
export function withAdminInertiaPageHandler(
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  return composePageHandler(HttpKernel.groups.admin(), handler)
}

/**
 * Member 區域 wrapper。
 * Chain：attachJwt → attachWebCsrf → injectSharedData → requireMember → applyPendingCookies → handler
 */
export function withMemberInertiaPageHandler(
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  return composePageHandler(HttpKernel.groups.member(), handler)
}
