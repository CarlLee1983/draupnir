import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import { loadMessages, resolvePageLocale } from '@/Shared/Infrastructure/I18n'
import type { LocaleCode } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * Props merged into every Inertia response when `injectSharedData` runs (auth, org header, flash).
 */
export interface InertiaSharedData {
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
      success: ctx.get<string>('flash:success') ?? undefined,
      error: ctx.get<string>('flash:error') ?? undefined,
    },
  }

  ctx.set('inertia:shared', shared)
}
