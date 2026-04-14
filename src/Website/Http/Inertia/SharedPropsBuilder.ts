import type { I18nMessage, LocaleCode, Messages } from '@/Shared/Infrastructure/I18n'
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
  /**
   * Partial<Messages> at the transport boundary — catalog completeness is guaranteed by
   * loadMessages() at load time, but the DTO shape is partial to allow safe defaults
   * (e.g. `messages: {}` in tests / non-Inertia callers).
   */
  messages: Partial<Messages>
  flash: {
    success?: I18nMessage
    error?: I18nMessage
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
 * Writes a structured flash message as a JSON cookie.
 * The cookie expires after 60 seconds (one-time read on next page load).
 */
export function setFlash(ctx: IHttpContext, type: 'success' | 'error', msg: I18nMessage): void {
  ctx.setCookie(`flash:${type}`, encodeURIComponent(JSON.stringify(msg)), {
    path: '/',
    maxAge: 60,
    sameSite: 'Lax',
  })
}

/**
 * Parses a raw flash cookie value into an I18nMessage.
 * Supports both new JSON format `{"key":"..."}` and legacy plain-string format.
 * Legacy strings are treated as { key } where key is cast to MessageKey for backwards compatibility.
 */
function parseFlashValue(raw: string): I18nMessage {
  try {
    const decoded = decodeURIComponent(raw)
    const parsed: unknown = JSON.parse(decoded)
    if (parsed !== null && typeof parsed === 'object' && 'key' in parsed) {
      return parsed as I18nMessage
    }
  } catch {
    // fall through to legacy handling
  }
  const decoded = (() => {
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  })()
  return { key: decoded as I18nMessage['key'] }
}

/**
 * Reads a flash value for `key`, preferring in-context value over cookie.
 * When the value comes from a cookie, queues a clearing Set-Cookie so flash is one-time.
 */
function readFlash(ctx: IHttpContext, key: string): I18nMessage | undefined {
  const fromCtx = ctx.get<string>(key)
  if (fromCtx !== undefined) {
    return parseFlashValue(encodeURIComponent(fromCtx))
  }

  const raw = ctx.getCookie(key)
  if (!raw) return undefined

  // Clear the one-time flash cookie immediately
  ctx.setCookie(key, '', { path: '/', maxAge: 0, sameSite: 'Lax' })

  return parseFlashValue(raw)
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
