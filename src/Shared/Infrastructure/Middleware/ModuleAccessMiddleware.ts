// src/Shared/Infrastructure/Middleware/ModuleAccessMiddleware.ts
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from './AuthMiddleware'
import type { CheckModuleAccessService } from '@/Modules/AppModule/Application/Services/CheckModuleAccessService'

let checkModuleAccessService: CheckModuleAccessService | null = null

export function setCheckModuleAccessService(service: CheckModuleAccessService): void {
  checkModuleAccessService = service
}

/**
 * Middleware that checks if an organization has access to a specific module.
 * 
 * @param moduleName - The name of the module to check access for.
 * @returns A Middleware function.
 */
export function createModuleAccessMiddleware(moduleName: string): Middleware {
  return async (ctx: IHttpContext, next: () => Promise<Response>): Promise<Response> => {
    if (!checkModuleAccessService) {
      return ctx.json(
        { success: false, message: 'Module access check service not initialized', error: 'INTERNAL_ERROR' },
        500,
      )
    }

    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }

    // Admins skip module access checks
    if (auth.role === 'admin') {
      return next()
    }

    // Retrieve orgId from route params or auth context
    const orgId = ctx.getParam('orgId')
    if (!orgId) {
      return ctx.json({ success: false, message: 'Missing organization information', error: 'MISSING_ORG' }, 400)
    }

    const result = await checkModuleAccessService.execute(orgId, moduleName)
    if (!result.allowed) {
      return ctx.json(
        {
          success: false,
          message: result.reason ?? `Access denied for module: ${moduleName}`,
          error: 'MODULE_ACCESS_DENIED',
        },
        403,
      )
    }

    return next()
  }
}

