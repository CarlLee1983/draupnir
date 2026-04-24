import { isSecureRequest } from '@/Shared/Infrastructure/Http/isSecureRequest'
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

function timingSafeStringEqual(a: string, b: string): boolean {
  const ae = new TextEncoder().encode(a)
  const be = new TextEncoder().encode(b)
  if (ae.length !== be.length) return false
  let diff = 0
  for (let i = 0; i < ae.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    diff |= ae[i]! ^ be[i]!
  }
  return diff === 0
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
  const secure = isSecureRequest(ctx)
  ctx.setCookie(WEB_CSRF_COOKIE_NAME, encodeURIComponent(token), {
    path: '/',
    sameSite: 'Lax',
    secure,
    maxAge: 60 * 60 * 12,
  })
}

function isInertiaRequest(ctx: IHttpContext): boolean {
  const h = ctx.getHeader('x-inertia') ?? ctx.getHeader('X-Inertia')
  return h === 'true' || h === '1'
}

/**
 * Web / Inertia CSRF: validates mutating requests, then always rotates the cookie + context token.
 *
 * When validation fails on an Inertia XHR request the middleware returns a 302 redirect
 * (with `X-Inertia-Location` header) to the current page pathname.  This causes the
 * Inertia client to perform a full-page reload which re-issues a fresh CSRF token and
 * avoids the raw "plain JSON response" dialog that would otherwise appear.
 *
 * For non-Inertia requests the classic 419 JSON response is returned unchanged.
 */
export function attachWebCsrf(): Middleware {
  return async (ctx, next) => {
    const method = ctx.getMethod().toUpperCase()
    if (UNSAFE_METHODS.has(method)) {
      if (!validateWebCsrf(ctx)) {
        if (isInertiaRequest(ctx)) {
          // Inertia v3 only handles X-Inertia-Location on 409 responses (not 302).
          // Returning 409 + X-Inertia-Location triggers a full-page reload which
          // re-issues a fresh CSRF cookie without causing a redirect loop.
          const location = ctx.getPathname() || '/'
          return new Response(null, {
            status: 409,
            headers: {
              'X-Inertia-Location': location,
            },
          })
        }
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
