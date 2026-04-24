/**
 * IHttpContext - HTTP Context Interface (Framework Agnostic)
 *
 * Controllers depend on this interface instead of a specific framework
 * implementation (like GravitoContext), allowing for future framework
 * migration or pure mock unit testing.
 */

import type { GravitoContext } from '@gravito/core'

/** Cookie 設定選項 */
export interface CookieOptions {
  /** Only accessible by the server. */
  httpOnly?: boolean
  /** Only sent over HTTPS. */
  secure?: boolean
  /** Controls cross-site cookie sending behavior. */
  sameSite?: 'Strict' | 'Lax' | 'None'
  /** The path for which the cookie is valid. */
  path?: string
  /** Maximum lifetime of the cookie in seconds. */
  maxAge?: number
}

/** Pending cookie，用於 setCookie queue */
export interface PendingCookie {
  /** Name of the cookie. */
  name: string
  /** Value of the cookie. */
  value: string
  /** Cookie options. */
  options: CookieOptions
}

export interface IHttpContext {
  /**
   * Retrieves the request body as text.
   *
   * @returns A promise that resolves with the raw request body string.
   */
  getBodyText(): Promise<string>

  /**
   * Retrieves the request body parsed as JSON.
   *
   * @template T - The expected shape of the JSON body.
   * @returns A promise that resolves with the parsed JSON body.
   */
  getJsonBody<T>(): Promise<T>

  /**
   * Retrieves the request body parsed as JSON (Alias for getJsonBody).
   *
   * @template T - The expected shape of the JSON body.
   * @returns A promise that resolves with the parsed JSON body.
   */
  getBody<T>(): Promise<T>

  /**
   * Retrieves a header value from the request.
   *
   * @param name - The header name (case-insensitive).
   * @returns The header value if present, otherwise undefined.
   */
  getHeader(name: string): string | undefined

  /**
   * Retrieves a route parameter value.
   *
   * @param name - The parameter name.
   * @returns The parameter value if present, otherwise undefined.
   */
  getParam(name: string): string | undefined

  /**
   * Returns the request pathname (excluding query string).
   *
   * @returns The pathname string.
   */
  getPathname(): string

  /**
   * Returns the HTTP method (e.g., `GET`, `POST`).
   *
   * @returns The uppercased HTTP method.
   */
  getMethod(): string

  /**
   * Retrieves a query string parameter value.
   *
   * @param name - The query parameter name.
   * @returns The query value if present, otherwise undefined.
   */
  getQuery(name: string): string | undefined

  /** All route parameters */
  params: Record<string, string | undefined>

  /** All query parameters (?key=value) */
  query: Record<string, string | undefined>

  /** All request headers */
  headers: Record<string, string | undefined>

  /**
   * Returns a JSON response.
   *
   * @template T - The payload type.
   * @param data - The object to serialize as JSON.
   * @param statusCode - HTTP status code (defaults to 200).
   * @returns A Response object.
   */
  json<T>(data: T, statusCode?: number): Response

  /**
   * Returns a plain text response.
   *
   * @param content - The text content.
   * @param statusCode - HTTP status code (defaults to 200).
   * @returns A Response object.
   */
  text(content: string, statusCode?: number): Response

  /**
   * Returns a redirect response.
   *
   * @param url - The target URL.
   * @param statusCode - HTTP status code (defaults to 302).
   * @returns A Response object.
   */
  redirect(url: string, statusCode?: number): Response

  /**
   * Retrieves a value from the request context storage.
   *
   * @template T - The value type.
   * @param key - Context key.
   * @returns The value if stored, otherwise undefined.
   */
  get<T>(key: string): T | undefined

  /**
   * Sets a value in the request context storage.
   *
   * @param key - Context key.
   * @param value - Value to store.
   */
  set(key: string, value: unknown): void

  /**
   * Retrieves a cookie value from the request 'Cookie' header.
   *
   * @param name - Cookie name.
   * @returns The cookie value if present, otherwise undefined.
   */
  getCookie(name: string): string | undefined

  /**
   * Adds a cookie to the pending queue to be applied to the response.
   *
   * @param name - Cookie name.
   * @param value - Cookie value.
   * @param options - Cookie options (httpOnly, secure, etc.).
   */
  setCookie(name: string, value: string, options?: CookieOptions): void
}

/**
 * Factory function: Adapts a GravitoContext to IHttpContext.
 *
 * Provides a framework-agnostic bridge for controllers.
 *
 * @param ctx - The Gravito framework context.
 * @returns An implementation of IHttpContext.
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
    m = /^\/api\/invitations\/([^/]+)(?:\/|$)/.exec(pathname)
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
    let m = /^\/reset-password\/([^/]+)/.exec(pathname)
    if (m?.[1]) return decodeURIComponent(m[1])
    m = /^\/verify-email\/([^/]+)/.exec(pathname)
    if (m?.[1]) return decodeURIComponent(m[1])
    m = /^\/api\/invitations\/([^/]+)(?:\/|$)/.exec(pathname)
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
    getMethod: () => String((ctx.req as { method?: string }).method ?? 'GET').toUpperCase(),
    getQuery: (name) => query[name],
    params: Object.keys(routeParams).length > 0 ? routeParams : legacyParams,
    query,
    headers,
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    json: (data, statusCode) => ctx.json(data, statusCode as any),
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    text: (content, statusCode) => ctx.text(content, statusCode as any),
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    redirect: (url, statusCode = 302) => ctx.redirect(url, statusCode as any),
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    get: <T>(key: string) => ctx.get(key as any) as T | undefined,
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    set: (key, value) => ctx.set(key as any, value),
    getCookie: (name: string) => {
      const cookieHeader = (ctx.req.header('Cookie') ?? ctx.req.header('cookie')) as
        | string
        | undefined
      if (!cookieHeader) return undefined
      for (const pair of cookieHeader.split(';')) {
        const [rawKey, ...rest] = pair.split('=')
        if (rawKey?.trim() === name) return rest.join('=').trim() || undefined
      }
      return undefined
    },
    setCookie: (name: string, value: string, options: CookieOptions = {}) => {
      const pending: PendingCookie[] = (ctx.get('__pending_cookies__') as PendingCookie[]) ?? []
      pending.push({ name, value, options })
      ctx.set('__pending_cookies__', pending)
    },
  }
}
