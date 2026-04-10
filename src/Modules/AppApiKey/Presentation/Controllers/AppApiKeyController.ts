import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IssueAppKeyService } from '../../Application/Services/IssueAppKeyService'
import type { ListAppKeysService } from '../../Application/Services/ListAppKeysService'
import type { RotateAppKeyService } from '../../Application/Services/RotateAppKeyService'
import type { RevokeAppKeyService } from '../../Application/Services/RevokeAppKeyService'
import type { SetAppKeyScopeService } from '../../Application/Services/SetAppKeyScopeService'
import type { GetAppKeyUsageService } from '../../Application/Services/GetAppKeyUsageService'

export class AppApiKeyController {
  constructor(
    private readonly issueService: IssueAppKeyService,
    private readonly listService: ListAppKeysService,
    private readonly rotateService: RotateAppKeyService,
    private readonly revokeService: RevokeAppKeyService,
    private readonly setScopeService: SetAppKeyScopeService,
    private readonly getUsageService: GetAppKeyUsageService,
  ) {}

  async issue(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const body = await ctx.getJsonBody<{
      label?: string
      scope?: string
      rotationPolicy?: {
        autoRotate: boolean
        rotationIntervalDays?: number
        gracePeriodHours?: number
      }
      boundModuleIds?: string[]
      expiresAt?: string
    }>()
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const result = await this.issueService.execute({
      orgId,
      issuedByUserId: auth.userId,
      callerSystemRole: auth.role,
      label: body.label ?? '',
      scope: body.scope,
      rotationPolicy: body.rotationPolicy,
      boundModuleIds: body.boundModuleIds,
      expiresAt: body.expiresAt,
    })
    return ctx.json(result, result.success ? 201 : 400)
  }

  async list(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const page = ctx.getQuery('page') ? parseInt(ctx.getQuery('page')!, 10) : 1
    const limit = ctx.getQuery('limit') ? parseInt(ctx.getQuery('limit')!, 10) : 20
    const result = await this.listService.execute(orgId, auth.userId, auth.role, page, limit)
    return ctx.json(result)
  }

  async rotate(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const keyId = ctx.getParam('keyId')
    if (!keyId) return ctx.json({ success: false, message: '缺少 keyId' }, 400)
    const result = await this.rotateService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    const status = result.success ? 200 : result.error === 'KEY_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }

  async revoke(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const keyId = ctx.getParam('keyId')
    if (!keyId) return ctx.json({ success: false, message: '缺少 keyId' }, 400)
    const result = await this.revokeService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    const status = result.success ? 200 : result.error === 'KEY_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }

  async setScope(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const keyId = ctx.getParam('keyId')
    if (!keyId) return ctx.json({ success: false, message: '缺少 keyId' }, 400)
    const body = await ctx.getJsonBody<{ scope?: string; boundModuleIds?: string[] }>()
    const result = await this.setScopeService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      scope: body.scope,
      boundModuleIds: body.boundModuleIds,
    })
    const status = result.success ? 200 : result.error === 'KEY_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }

  async getUsage(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const keyId = ctx.getParam('keyId')
    if (!keyId) return ctx.json({ success: false, message: '缺少 keyId' }, 400)
    const result = await this.getUsageService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      startDate: ctx.getQuery('startDate') ?? undefined,
      endDate: ctx.getQuery('endDate') ?? undefined,
    })
    const status = result.success ? 200 : result.error === 'KEY_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }
}
