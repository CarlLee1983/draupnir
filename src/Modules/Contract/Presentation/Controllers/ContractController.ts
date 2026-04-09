// src/Modules/Contract/Presentation/Controllers/ContractController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { CreateContractService } from '../../Application/Services/CreateContractService'
import type { ActivateContractService } from '../../Application/Services/ActivateContractService'
import type { UpdateContractService } from '../../Application/Services/UpdateContractService'
import type { AssignContractService } from '../../Application/Services/AssignContractService'
import type { TerminateContractService } from '../../Application/Services/TerminateContractService'
import type { RenewContractService } from '../../Application/Services/RenewContractService'
import type { ListContractsService } from '../../Application/Services/ListContractsService'
import type { GetContractDetailService } from '../../Application/Services/GetContractDetailService'
import type { HandleContractExpiryService } from '../../Application/Services/HandleContractExpiryService'
import type {
  CreateContractParams,
  UpdateContractParams,
  RenewContractParams,
  AssignContractParams,
  ListContractsQueryParams,
} from '../Requests'

export class ContractController {
  constructor(
    private readonly createService: CreateContractService,
    private readonly activateService: ActivateContractService,
    private readonly updateService: UpdateContractService,
    private readonly assignService: AssignContractService,
    private readonly terminateService: TerminateContractService,
    private readonly renewService: RenewContractService,
    private readonly listService: ListContractsService,
    private readonly getDetailService: GetContractDetailService,
    private readonly handleContractExpiryService: HandleContractExpiryService,
  ) {}

  async create(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const body = ctx.get('validated') as CreateContractParams
    const result = await this.createService.execute({
      targetType: body.targetType,
      targetId: body.targetId,
      terms: body.terms,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    return ctx.json(result, result.success ? 201 : 400)
  }

  async activate(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: '缺少 contractId' }, 400)
    const result = await this.activateService.execute(contractId, auth.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async update(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: '缺少 contractId' }, 400)
    const body = ctx.get('validated') as UpdateContractParams
    const result = await this.updateService.execute({
      contractId,
      terms: body.terms,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    return ctx.json(result, result.success ? 200 : 400)
  }

  async assign(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: '缺少 contractId' }, 400)
    const body = ctx.get('validated') as AssignContractParams
    const result = await this.assignService.execute({
      contractId,
      targetType: body.targetType,
      targetId: body.targetId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    return ctx.json(result, result.success ? 200 : 400)
  }

  async terminate(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: '缺少 contractId' }, 400)
    const result = await this.terminateService.execute(contractId, auth.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async renew(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: '缺少 contractId' }, 400)
    const body = ctx.get('validated') as RenewContractParams
    const result = await this.renewService.execute(contractId, body.terms, auth.userId, auth.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  /** 管理員觸發：處理即將到期事件與已過期合約（供 Cron 或手動呼叫） */
  async handleExpiry(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    if (auth.role !== 'admin') {
      return ctx.json({ success: false, message: '僅管理者可執行', error: 'FORBIDDEN' }, 403)
    }
    const counts = await this.handleContractExpiryService.execute()
    return ctx.json({ success: true, message: '已處理合約到期檢查', data: counts })
  }

  async list(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const query = ctx.get('validated') as ListContractsQueryParams
    const result = await this.listService.execute(query.targetId, auth.userId, auth.role)
    return ctx.json(result)
  }

  async getDetail(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: '缺少 contractId' }, 400)
    const result = await this.getDetailService.execute(contractId, auth.role)
    const status = result.success ? 200 : (result.error === 'NOT_FOUND' ? 404 : 400)
    return ctx.json(result, status)
  }
}
