// src/Shared/Infrastructure/Middleware/ModuleAccessMiddleware.ts
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from './AuthMiddleware'
import type { CheckModuleAccessService } from '@/Modules/AppModule/Application/Services/CheckModuleAccessService'

let checkModuleAccessService: CheckModuleAccessService | null = null

export function setCheckModuleAccessService(service: CheckModuleAccessService): void {
  checkModuleAccessService = service
}

export function createModuleAccessMiddleware(moduleName: string): Middleware {
  return async (ctx: IHttpContext, next: () => Promise<Response>): Promise<Response> => {
    if (!checkModuleAccessService) {
      return ctx.json({ success: false, message: '模組存取檢查服務未初始化', error: 'INTERNAL_ERROR' }, 500)
    }

    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    }

    // admin 跳過模組存取檢查
    if (auth.role === 'admin') {
      return next()
    }

    // 從路由參數或 auth context 取得 orgId
    const orgId = ctx.getParam('orgId')
    if (!orgId) {
      return ctx.json({ success: false, message: '缺少組織資訊', error: 'MISSING_ORG' }, 400)
    }

    const result = await checkModuleAccessService.execute(orgId, moduleName)
    if (!result.allowed) {
      return ctx.json({
        success: false,
        message: result.reason ?? `無權存取模組 ${moduleName}`,
        error: 'MODULE_ACCESS_DENIED',
      }, 403)
    }

    return next()
  }
}
