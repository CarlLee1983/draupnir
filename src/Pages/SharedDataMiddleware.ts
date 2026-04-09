import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export interface InertiaSharedData {
  auth: {
    user: {
      id: string
      email: string
      role: string
    } | null
  }
  currentOrgId: string | null
  flash: {
    success?: string
    error?: string
  }
}

export function injectSharedData(ctx: IHttpContext): void {
  const authContext = AuthMiddleware.getAuthContext(ctx)

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
    currentOrgId:
      ctx.getHeader('X-Organization-Id') ?? ctx.getHeader('x-organization-id') ?? null,
    flash: {
      success: ctx.get<string>('flash:success') ?? undefined,
      error: ctx.get<string>('flash:error') ?? undefined,
    },
  }

  ctx.set('inertia:shared', shared)
}
