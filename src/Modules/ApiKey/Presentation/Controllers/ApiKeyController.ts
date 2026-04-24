import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { CreateApiKeyService } from '../../Application/Services/CreateApiKeyService'
import type { ListApiKeysService } from '../../Application/Services/ListApiKeysService'
import type { RevokeApiKeyService } from '../../Application/Services/RevokeApiKeyService'
import type { SetKeyPermissionsService } from '../../Application/Services/SetKeyPermissionsService'
import type { UpdateKeyLabelService } from '../../Application/Services/UpdateKeyLabelService'

export class ApiKeyController {
  constructor(
    private readonly createService: CreateApiKeyService,
    private readonly listService: ListApiKeysService,
    private readonly revokeService: RevokeApiKeyService,
    private readonly updateLabelService: UpdateKeyLabelService,
    private readonly setPermissionsService: SetKeyPermissionsService,
  ) {}

  async create(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const body = await ctx.getJsonBody<{
      label?: string
      allowedModels?: string[]
      rateLimitRpm?: number
      rateLimitTpm?: number
      expiresAt?: string
    }>()
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const result = await this.createService.execute({
      orgId,
      createdByUserId: auth.userId,
      callerSystemRole: auth.role,
      label: body.label ?? '',
      allowedModels: body.allowedModels,
      rateLimitRpm: body.rateLimitRpm,
      rateLimitTpm: body.rateLimitTpm,
      expiresAt: body.expiresAt,
    })
    const status = result.success ? 201 : 400
    return ctx.json(result, status)
  }

  async list(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const pageParam = ctx.getQuery('page')
    const page = pageParam ? parseInt(pageParam, 10) : 1
    const limitParam = ctx.getQuery('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 20
    const result = await this.listService.execute(orgId, auth.userId, auth.role, page, limit)
    return ctx.json(result)
  }

  async revoke(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const keyId = ctx.getParam('keyId')
    if (!keyId) return ctx.json({ success: false, message: 'Missing keyId' }, 400)
    const result = await this.revokeService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    const status = result.success ? 200 : result.error === 'KEY_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }

  async updateLabel(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const keyId = ctx.getParam('keyId')
    if (!keyId) return ctx.json({ success: false, message: 'Missing keyId' }, 400)
    const body = await ctx.getJsonBody<{ label?: string }>()
    const result = await this.updateLabelService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      label: body.label ?? '',
    })
    const status = result.success ? 200 : result.error === 'KEY_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }

  async setPermissions(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const keyId = ctx.getParam('keyId')
    if (!keyId) return ctx.json({ success: false, message: 'Missing keyId' }, 400)
    const body = await ctx.getJsonBody<{
      allowedModels?: string[]
      rateLimitRpm?: number | null
      rateLimitTpm?: number | null
    }>()
    const result = await this.setPermissionsService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      allowedModels: body.allowedModels,
      rateLimitRpm: body.rateLimitRpm,
      rateLimitTpm: body.rateLimitTpm,
    })
    const status = result.success ? 200 : result.error === 'KEY_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }
}
