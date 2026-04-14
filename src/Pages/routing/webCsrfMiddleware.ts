import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/** Readable (non-HttpOnly) cookie so the SPA can mirror it into request headers (Laravel-style double submit). */
export const WEB_CSRF_COOKIE_NAME = 'XSRF-TOKEN' as const

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function randomCsrfToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64url')
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Replaces node:crypto's timingSafeEqual to avoid banned imports.
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

function decodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function readCookieCsrf(ctx: IHttpContext): string {
  const raw = ctx.getCookie(WEB_CSRF_COOKIE_NAME)
  if (!raw) return ''
  return decodeCookieValue(raw)
}

function readHeaderCsrf(ctx: IHttpContext): string {
  const candidates = [
    ctx.getHeader('X-XSRF-TOKEN'),
    ctx.getHeader('x-xsrf-token'),
    ctx.getHeader('X-CSRF-Token'),
    ctx.getHeader('x-csrf-token'),
  ]
  for (const c of candidates) {
    const t = c?.trim()
    if (t) return t
  }
  return ''
}

/**
 * Validates double-submit CSRF: {@link WEB_CSRF_COOKIE_NAME} must match one of the CSRF headers.
 */
export function validateWebCsrf(ctx: IHttpContext): boolean {
  const cookie = readCookieCsrf(ctx)
  const header = readHeaderCsrf(ctx)
  if (!cookie || !header) return false
  return timingSafeStringEqual(cookie, header)
}

/**
 * Issues a fresh token for the current response: `ctx` key `csrfToken` (for shared props) + Set-Cookie.
 */
export function issueWebCsrfToken(ctx: IHttpContext): void {
  const token = randomCsrfToken()
  ctx.set('csrfToken', token)
  const secure = process.env.NODE_ENV === 'production'
  ctx.setCookie(WEB_CSRF_COOKIE_NAME, encodeURIComponent(token), {
    path: '/',
    sameSite: 'Lax',
    secure,
    maxAge: 60 * 60 * 12,
  })
}

/**
 * Web / Inertia CSRF: validates mutating requests, then always rotates the cookie + context token.
 */
export function attachWebCsrf(): Middleware {
  return async (ctx, next) => {
    const method = ctx.getMethod().toUpperCase()
    if (UNSAFE_METHODS.has(method)) {
      if (!validateWebCsrf(ctx)) {
        return ctx.json(
          { success: false, message: 'CSRF token mismatch or missing', error: 'CSRF_MISMATCH' },
          419,
        )
      }
    }
    issueWebCsrfToken(ctx)
    return next()
  }
}
