/**
 * IHttpContext - HTTP Context Interface (Framework Agnostic)
 *
 * Controllers depend on this interface instead of a specific framework 
 * implementation (like GravitoContext), allowing for future framework 
 * migration or pure mock unit testing.
 */

import type { GravitoContext } from '@gravito/core'

export interface IHttpContext {
  /** Retrieves the request body as text */
  getBodyText(): Promise<string>

  /** Retrieves the request body parsed as JSON */
  getJsonBody<T>(): Promise<T>

  /** Retrieves the request body parsed as JSON (Alias for getJsonBody) */
  getBody<T>(): Promise<T>

  /** Retrieves a header value from the request */
  getHeader(name: string): string | undefined

  /** Retrieves a route parameter */
  getParam(name: string): string | undefined

  /** 
   * The request pathname (excluding query). 
   * Used as a fallback for route parameter resolution. 
   */
  getPathname(): string

  /** Retrieves a query string parameter */
  getQuery(name: string): string | undefined

  /** All route parameters */
  params: Record<string, string | undefined>

  /** All query parameters (?key=value) */
  query: Record<string, string | undefined>

  /** All request headers */
  headers: Record<string, string | undefined>

  /** Returns a JSON response */
  json<T>(data: T, statusCode?: number): Response

  /** Returns a text response */
  text(content: string, statusCode?: number): Response

  /** Returns a redirect response (Default 302) */
  redirect(url: string, statusCode?: number): Response

  /** Retrieves a value from the context (e.g., jwtPayload) */
  get<T>(key: string): T | undefined

  /** Sets a value in the context */
  set(key: string, value: unknown): void
}

/**
 * Factory function: Adapts a GravitoContext to IHttpContext.
 *
 * @example
 * core.router.post("/users", (ctx) =>
 *   controller.create(fromGravitoContext(ctx))
 * )
 */

/** 
 * Gravito 2 sometimes fails to populate req.param; resolution via pathname fallback 
 */
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
  if (name === 'appId') {
    const m = /^\/api\/dev-portal\/apps\/([^/]+)(?:\/|$)/.exec(pathname)
    if (m?.[1]) return decodeURIComponent(m[1])
  }
  if (name === 'keyId') {
    let m = /^\/api\/dev-portal\/apps\/[^/]+\/keys\/([^/]+)(?:\/|$)/.exec(pathname)
    if (m?.[1]) return decodeURIComponent(m[1])
    m = /^\/api\/keys\/([^/]+)(?:\/|$)/.exec(pathname)
    if (m?.[1]) return decodeURIComponent(m[1])
    m = /^\/member\/api-keys\/([^/]+)\/revoke(?:\/|$)/.exec(pathname)
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
  // Parse query parameters
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

  // Provide headers access (via Proxy)
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

  // Gravito 2: Dynamic route parameters are in ctx.req.param() / ctx.req.params(), not ctx.params
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
