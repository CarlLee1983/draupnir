/**
 * IAuthRouter - Auth 路由註冊介面（框架無關）
 *
 * Auth 模組只依賴此介面註冊路由，不依賴 PlanetCore / Gravito。
 * 宿主依所用框架實作此介面（如 GravitoAuthRouter、ExpressAuthRouter），
 * 日後抽換框架只需新增適配器並傳入即可。
 */

import type { IHttpContext } from './IHttpContext'

export type AuthRouteHandler = (ctx: IHttpContext) => Promise<Response>

/**
 * 可為 Auth 模組註冊 HTTP 路由的介面
 *
 * - post / get：公開路由
 * - postWithGuard / getWithGuard：需 JWT 驗證的路由（由適配器套用中介軟體）
 */
export interface IAuthRouter {
	post(path: string, handler: AuthRouteHandler): void
	get(path: string, handler: AuthRouteHandler): void
	postWithGuard(path: string, handler: AuthRouteHandler): void
	getWithGuard(path: string, handler: AuthRouteHandler): void
}
