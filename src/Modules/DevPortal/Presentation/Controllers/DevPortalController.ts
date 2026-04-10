import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { RegisterAppService } from '../../Application/Services/RegisterAppService'
import type { ListAppsService } from '../../Application/Services/ListAppsService'
import type { ManageAppKeysService } from '../../Application/Services/ManageAppKeysService'
import type { ConfigureWebhookService } from '../../Application/Services/ConfigureWebhookService'
import type { GetApiDocsService } from '../../Application/Services/GetApiDocsService'

export class DevPortalController {
  constructor(
    private readonly registerAppService: RegisterAppService,
    private readonly listAppsService: ListAppsService,
    private readonly manageAppKeysService: ManageAppKeysService,
    private readonly configureWebhookService: ConfigureWebhookService,
    private readonly getApiDocsService: GetApiDocsService,
  ) {}

  async registerApp(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const body = await ctx.getJsonBody<{
      orgId?: string
      name?: string
      description?: string
      redirectUris?: string[]
    }>()
    if (!body.orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 422)
    if (!body.name) return ctx.json({ success: false, message: '缺少 name' }, 422)
    const result = await this.registerAppService.execute({
      orgId: body.orgId,
      createdByUserId: auth.userId,
      callerSystemRole: auth.role,
      name: body.name,
      description: body.description,
      redirectUris: body.redirectUris,
    })
    const status = result.success ? 201 : 400
    return ctx.json(result, status)
  }

  async listApps(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getQuery('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId 查詢參數' }, 422)
    const pageRaw = ctx.getQuery('page')
    const limitRaw = ctx.getQuery('limit')
    const result = await this.listAppsService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      page: pageRaw ? Number(pageRaw) : undefined,
      limit: limitRaw ? Number(limitRaw) : undefined,
    })
    return ctx.json(result, result.success ? 200 : 400)
  }

  async issueKey(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const appId = ctx.getParam('appId')
    if (!appId) return ctx.json({ success: false, message: '缺少 appId' }, 400)
    const body = await ctx.getJsonBody<{
      label?: string
      scope?: string
      boundModules?: string[]
    }>()
    const result = await this.manageAppKeysService.execute({
      applicationId: appId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      action: 'issue',
      label: body.label,
      scope: body.scope,
      boundModules: body.boundModules,
    })
    const status = result.success ? 201 : 400
    return ctx.json(result, status)
  }

  async listKeys(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const appId = ctx.getParam('appId')
    if (!appId) return ctx.json({ success: false, message: '缺少 appId' }, 400)
    const result = await this.manageAppKeysService.execute({
      applicationId: appId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      action: 'list',
    })
    return ctx.json(result)
  }

  async revokeKey(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const appId = ctx.getParam('appId')
    const keyId = ctx.getParam('keyId')
    if (!appId) return ctx.json({ success: false, message: '缺少 appId' }, 400)
    if (!keyId) return ctx.json({ success: false, message: '缺少 keyId' }, 400)
    const result = await this.manageAppKeysService.execute({
      applicationId: appId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      action: 'revoke',
      keyId,
    })
    const status = result.success ? 200 : result.error === 'APP_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }

  async configureWebhook(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const appId = ctx.getParam('appId')
    if (!appId) return ctx.json({ success: false, message: '缺少 appId' }, 400)
    const body = await ctx.getJsonBody<{
      webhookUrl?: string
      eventTypes?: string[]
    }>()
    if (!body.webhookUrl) return ctx.json({ success: false, message: '缺少 webhookUrl' }, 400)
    if (!body.eventTypes || body.eventTypes.length === 0) {
      return ctx.json({ success: false, message: '至少需要訂閱一個事件類型' }, 400)
    }
    const result = await this.configureWebhookService.execute({
      applicationId: appId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      webhookUrl: body.webhookUrl,
      eventTypes: body.eventTypes,
    })
    return ctx.json(result, result.success ? 200 : 400)
  }

  async getApiDocs(ctx: IHttpContext): Promise<Response> {
    const result = await this.getApiDocsService.execute()
    return ctx.json(result)
  }
}
