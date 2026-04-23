import { setFlash } from '@/Website/Http/Inertia/SharedPropsBuilder'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

type ValidationDetail = { field?: string; message?: string; code?: string }
type GravitoValidationErrorBody = {
  success?: boolean
  error?: {
    code?: string
    message?: string
    details?: ValidationDetail[]
  }
}

function isInertiaRequest(ctx: IHttpContext): boolean {
  const v = ctx.getHeader('x-inertia') ?? ctx.getHeader('X-Inertia')
  return v === 'true' || v === 'True'
}

function isSameHost(refererUrl: string, requestHost: string | undefined): boolean {
  if (!requestHost) return true
  try {
    return new URL(refererUrl).host.toLowerCase() === requestHost.toLowerCase()
  } catch {
    return false
  }
}

/**
 * If the response is a Gravito FormRequest JSON validation error (422) on an
 * Inertia (X-Inertia) request, convert it to a 302 back to the form (Referer) with
 * a one-time flash error, so the client does not see plain JSON and Inertia
 * can follow the redirect.
 */
export function createInertiaFormValidationResponseMiddleware(): Middleware {
  return async (ctx, next) => {
    const response = await next()
    if (response.status !== 422) return response

    if (!isInertiaRequest(ctx)) return response

    const ct = response.headers.get('content-type') ?? ''
    if (!ct.toLowerCase().includes('application/json')) return response

    let body: GravitoValidationErrorBody
    try {
      body = (await response.clone().json()) as GravitoValidationErrorBody
    } catch {
      return response
    }

    if (body?.success !== false) return response
    if (body.error?.code !== 'VALIDATION_ERROR') return response

    const first = body.error?.details?.[0]
    const message = first?.message?.trim() || body.error?.message || 'Validation failed'
    setFlash(ctx, 'error', {
      key: 'common.validationFailed',
      params: { message },
    })

    const requestHost = ctx.getHeader('host') ?? ctx.getHeader('Host')
    const ref = ctx.getHeader('referer') ?? ctx.getHeader('Referer')
    let to = '/'
    if (ref && isSameHost(ref, requestHost)) {
      try {
        const u = new URL(ref)
        to = u.pathname + (u.search || '')
      } catch {
        to = ctx.getPathname() || '/'
      }
    } else {
      to = ctx.getPathname() || '/'
    }

    return ctx.redirect(to, 302)
  }
}
