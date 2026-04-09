// src/Modules/AppModule/Presentation/Controllers/AppModuleController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { RegisterModuleService } from '../../Application/Services/RegisterModuleService'
import type { SubscribeModuleService } from '../../Application/Services/SubscribeModuleService'
import type { UnsubscribeModuleService } from '../../Application/Services/UnsubscribeModuleService'
import type { ListModulesService } from '../../Application/Services/ListModulesService'
import type { GetModuleDetailService } from '../../Application/Services/GetModuleDetailService'
import type { ListOrgSubscriptionsService } from '../../Application/Services/ListOrgSubscriptionsService'
import type { RegisterModuleParams, SubscribeModuleParams } from '../Requests'

export class AppModuleController {
  constructor(
    private readonly registerService: RegisterModuleService,
    private readonly subscribeService: SubscribeModuleService,
    private readonly unsubscribeService: UnsubscribeModuleService,
    private readonly listModulesService: ListModulesService,
    private readonly getDetailService: GetModuleDetailService,
    private readonly listOrgSubscriptionsService: ListOrgSubscriptionsService,
  ) {}

  async register(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const body = ctx.get('validated') as RegisterModuleParams
    const result = await this.registerService.execute({
      name: body.name,
      description: body.description,
      type: body.type,
      callerRole: auth.role,
    })
    return ctx.json(result, result.success ? 201 : 400)
  }

  async listModules(ctx: IHttpContext): Promise<Response> {
    const result = await this.listModulesService.execute()
    return ctx.json(result)
  }

  async getDetail(ctx: IHttpContext): Promise<Response> {
    const moduleId = ctx.getParam('moduleId')
    if (!moduleId) return ctx.json({ success: false, message: '缺少 moduleId' }, 400)
    const result = await this.getDetailService.execute(moduleId)
    const status = result.success ? 200 : (result.error === 'NOT_FOUND' ? 404 : 400)
    return ctx.json(result, status)
  }

  async subscribe(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const body = ctx.get('validated') as SubscribeModuleParams
    const result = await this.subscribeService.execute({
      orgId,
      moduleId: body.moduleId,
      callerUserId: auth.userId,
      callerRole: auth.role,
    })
    return ctx.json(result, result.success ? 201 : 400)
  }

  async unsubscribe(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    const moduleId = ctx.getParam('moduleId')
    if (!orgId || !moduleId) return ctx.json({ success: false, message: '缺少參數' }, 400)
    const result = await this.unsubscribeService.execute(orgId, moduleId)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async listOrgSubscriptions(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const result = await this.listOrgSubscriptionsService.execute(orgId)
    return ctx.json(result)
  }
}
