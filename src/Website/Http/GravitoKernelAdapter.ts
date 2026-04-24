/**
 * Adapter to bridge project-specific middleware with the Gravito framework kernel.
 */
import type { GravitoMiddleware, PlanetCore } from '@gravito/core'
import { fromGravitoContext } from '@/Shared/Presentation/IHttpContext'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/**
 * 將專案 Middleware 轉換為 GravitoMiddleware。
 *
 * 這是整個 codebase 唯一知道 GravitoMiddleware 型別的地方。
 * 所有型別轉換都集中在此，未來換框架只改這個檔案。
 *
 * @param mw - The project-specific middleware.
 * @returns A Gravito-compatible middleware.
 */
export function toGravitoMiddleware(mw: Middleware): GravitoMiddleware {
  return async (gravitoCtx, next) => {
    const ctx = fromGravitoContext(gravitoCtx)
    gravitoCtx.res = await mw(ctx, async () => {
      await next()
      return gravitoCtx.res ?? new Response(null, { status: 200 })
    })
  }
}

/**
 * 將 HttpKernel.global() 的 middleware 清單掛載到 Gravito adapter。
 *
 * @example
 * ```ts
 * // bootstrap.ts
 * registerGlobalMiddlewares(core, HttpKernel.global())
 * ```
 *
 * @param core - The Gravito core instance.
 * @param middlewares - Array of global middleware to register.
 */
export function registerGlobalMiddlewares(core: PlanetCore, middlewares: Middleware[]): void {
  for (const mw of middlewares) {
    // biome-ignore lint/correctness/useHookAtTopLevel: false positive, useGlobal is not a React Hook
    core.adapter.useGlobal(toGravitoMiddleware(mw))
  }
}
