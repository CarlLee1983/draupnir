/**
 * IHttpContext - HTTP 上下文介面（框架無關）
 *
 * 控制器依賴此介面而非具體框架實作（GravitoContext），
 * 允許未來換框架或用 pure mock 單元測試。
 */

import type { GravitoContext } from '@gravito/core'

export interface IHttpContext {
	/** 取得請求文字內容 */
	getBodyText(): Promise<string>

	/** 取得請求 JSON 內容 */
	getJsonBody<T>(): Promise<T>

	/** 取得請求 JSON 內容（getJsonBody 的別名） */
	getBody<T>(): Promise<T>

	/** 取得請求 header 值 */
	getHeader(name: string): string | undefined

	/** 取得路由參數 */
	getParam(name: string): string | undefined

	/** 請求路徑 pathname（不含 query），供路由參數備援解析 */
	getPathname(): string

	/** 取得查詢參數 */
	getQuery(name: string): string | undefined

	/** 路由參數 */
	params: Record<string, string | undefined>

	/** 查詢參數 ?key=value */
	query: Record<string, string | undefined>

	/** 請求 headers */
	headers: Record<string, string | undefined>

	/** 回傳 JSON 回應 */
	json<T>(data: T, statusCode?: number): Response

	/** 回傳文字回應 */
	text(content: string, statusCode?: number): Response

	/** 回傳重導回應（預設 302） */
	redirect(url: string, statusCode?: number): Response

	/** 從 context 取得值（如 jwtPayload） */
	get<T>(key: string): T | undefined

	/** 在 context 設定值 */
	set(key: string, value: unknown): void
}

/**
 * 工廠函式：將 GravitoContext 適配為 IHttpContext
 *
 * @example
 * core.router.post("/users", (ctx) =>
 *   controller.create(fromGravitoContext(ctx))
 * )
 */

/** Gravito 2 在部分情境下不會填入 req.param；由 pathname 備援解析 */
function fallbackPathParam(pathname: string, name: string): string | undefined {
	if (!pathname) return undefined
	if (name === 'id') {
		let m = /^\/api\/users\/([^/]+)(?:\/|$)/.exec(pathname)
		if (m?.[1] && m[1] !== 'me') return decodeURIComponent(m[1])
		m = /^\/api\/organizations\/([^/]+)(?:\/|$)/.exec(pathname)
		if (m?.[1]) return decodeURIComponent(m[1])
		return undefined
	}
	if (name === 'orgId') {
		const m = /^\/api\/organizations\/([^/]+)(?:\/|$)/.exec(pathname)
		if (m?.[1]) return decodeURIComponent(m[1])
	}
	if (name === 'keyId') {
		const m = /^\/api\/keys\/([^/]+)(?:\/|$)/.exec(pathname)
		if (m?.[1]) return decodeURIComponent(m[1])
	}
	if (name === 'token') {
		const m = /^\/api\/invitations\/([^/]+)(?:\/|$)/.exec(pathname)
		if (m?.[1]) return decodeURIComponent(m[1])
	}
	if (name === 'invId') {
		const m = /\/invitations\/([^/]+)(?:\/|$)/.exec(pathname)
		if (m?.[1]) return decodeURIComponent(m[1])
	}
	if (name === 'userId') {
		const m = /\/members\/([^/]+)(?:\/|$)/.exec(pathname)
		if (m?.[1]) return decodeURIComponent(m[1])
	}
	return undefined
}

export function fromGravitoContext(ctx: GravitoContext): IHttpContext {
	// 解析查詢參數
	const query = (() => {
		try {
			const u = ctx.req.url
			const url = u.startsWith('http') ? new URL(u) : new URL(u, 'http://localhost')
			const result: Record<string, string | undefined> = {}
			url.searchParams.forEach((value, key) => {
				result[key] = value
			})
			return result
		} catch {
			return {}
		}
	})()

	// 提供 headers 存取（透過 Proxy）
	const headers = new Proxy({} as Record<string, string | undefined>, {
		get: (_, key: string) => ctx.req.header(key),
	})

	const getJsonBodyFn = async <T>() => {
		const req = ctx.req as unknown as {
			json?: () => Promise<T>
			text: () => Promise<string>
		}
		if (typeof req.json === 'function') {
			return req.json()
		}
		return JSON.parse(await req.text()) as T
	}

	// Gravito 2：動態路由參數在 ctx.req.param() / ctx.req.params()，非 ctx.params
	const legacyParams = ((ctx as unknown as { params?: Record<string, string | undefined> })
		.params ?? {}) as Record<string, string | undefined>
	const routeParams = (() => {
		try {
			const p = ctx.req.params()
			return p as Record<string, string | undefined>
		} catch {
			return legacyParams
		}
	})()

	function resolvePathname(): string {
		const u = ctx.req.url
		try {
			if (u.startsWith('http://') || u.startsWith('https://')) {
				return new URL(u).pathname
			}
			return u.split('?')[0] || ''
		} catch {
			return u.split('?')[0] || ''
		}
	}

	return {
		getBodyText: () => ctx.req.text(),
		getJsonBody: getJsonBodyFn,
		getBody: getJsonBodyFn,
		getHeader: (name) => ctx.req.header(name),
		getParam: (name) => {
			const direct = ctx.req.param(name)
			if (direct != null && direct !== '') return direct
			const leg = legacyParams[name]
			if (leg != null && leg !== '') return leg
			return fallbackPathParam(resolvePathname(), name)
		},
		getPathname: () => resolvePathname(),
		getQuery: (name) => query[name],
		params: Object.keys(routeParams).length > 0 ? routeParams : legacyParams,
		query,
		headers,
		json: (data, statusCode) => ctx.json(data, statusCode as any),
		text: (content, statusCode) => ctx.text(content, statusCode as any),
		redirect: (url, statusCode = 302) => ctx.redirect(url, statusCode as any),
		get: <T>(key: string) => ctx.get(key as any) as T | undefined,
		set: (key, value) => ctx.set(key as any, value),
	}
}
