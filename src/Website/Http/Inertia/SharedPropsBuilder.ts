import type { LocaleCode } from '@/Shared/Infrastructure/I18n'
import { loadMessages, resolvePageLocale } from '@/Shared/Infrastructure/I18n'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * Props merged into every Inertia response when `injectSharedData` runs (auth, org header, flash).
 */
export interface InertiaSharedData {
  /** Populated by {@link resolveCsrfTokenForInertia}; consumed by Inertia forms / `InertiaService.render` merge. */
  csrfToken: string
  auth: {
    user: {
      id: string
      email: string
      role: string
    } | null
  }
  currentOrgId: string | null
  locale: LocaleCode
  messages: Record<string, string>
  flash: {
    success?: string
    error?: string
  }
}

const CSRF_COOKIE_NAMES = ['csrf_token', 'XSRF-TOKEN', 'xsrf-token'] as const

/**
 * Resolves the CSRF token for Inertia shared props.
 *
 * Resolution order:
 * 1. `ctx.get('csrfToken')` — set by upstream middleware if present
 * 2. First non-empty value from cookies `csrf_token`, `XSRF-TOKEN`, `xsrf-token` (URL-decoded when valid)
 */
export function resolveCsrfTokenForInertia(ctx: IHttpContext): string {
  const fromContext = ctx.get('csrfToken')
  if (typeof fromContext === 'string' && fromContext.length > 0) {
    return fromContext
  }
  for (const name of CSRF_COOKIE_NAMES) {
    const raw = ctx.getCookie(name)
    if (raw) {
      try {
        return decodeURIComponent(raw)
      } catch {
        return raw
      }
    }
  }
  return ''
}

/**
 * Reads a flash value for `key`, preferring in-context value over cookie.
 * When the value comes from a cookie, queues a clearing Set-Cookie so flash is one-time.
 */
function readFlash(ctx: IHttpContext, key: string): string | undefined {
  const fromCtx = ctx.get<string>(key)
  if (fromCtx !== undefined) return fromCtx

  const raw = ctx.getCookie(key)
  if (!raw) return undefined

  // Clear the one-time flash cookie immediately
  ctx.setCookie(key, '', { path: '/', maxAge: 0, sameSite: 'Lax' })

  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/**
 * Retrieves the shared Inertia props injected by {@link injectSharedData}.
 *
 * Use this in page handlers instead of manually casting `ctx.get('inertia:shared')`.
 * Returns a safe default when called outside an Inertia page handler (e.g. in tests).
 *
 * @param ctx - Current request context.
 */
export function getInertiaShared(ctx: IHttpContext): InertiaSharedData {
  return (ctx.get('inertia:shared') as InertiaSharedData | undefined) ?? {
    csrfToken: '',
    auth: { user: null },
    currentOrgId: null,
    locale: 'zh-TW' as LocaleCode,
    messages: {},
    flash: {},
  }
}

/**
 * Attaches cross-cutting Inertia props on the request context under `inertia:shared`.
 *
 * @param ctx - Current request; reads JWT-derived auth via {@link AuthMiddleware.getAuthContext}.
 */
export function injectSharedData(ctx: IHttpContext): void {
  const authContext = AuthMiddleware.getAuthContext(ctx)
  const locale = resolvePageLocale(ctx)
  const messages = loadMessages(locale)

  const shared: InertiaSharedData = {
    csrfToken: resolveCsrfTokenForInertia(ctx),
    auth: authContext
      ? {
          user: {
            id: authContext.userId,
            email: authContext.email,
            role: authContext.role,
          },
        }
      : { user: null },
    currentOrgId: ctx.getHeader('X-Organization-Id') ?? ctx.getHeader('x-organization-id') ?? null,
    locale,
    messages,
    flash: {
      success: readFlash(ctx, 'flash:success'),
      error: readFlash(ctx, 'flash:error'),
    },
  }

  ctx.set('inertia:shared', shared)
}
