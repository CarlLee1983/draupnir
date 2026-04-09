// src/Modules/Credit/Presentation/Controllers/CreditController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { TopUpCreditService } from '../../Application/Services/TopUpCreditService'
import type { GetBalanceService } from '../../Application/Services/GetBalanceService'
import type { GetTransactionHistoryService } from '../../Application/Services/GetTransactionHistoryService'

export class CreditController {
  constructor(
    private readonly topUpService: TopUpCreditService,
    private readonly getBalanceService: GetBalanceService,
    private readonly getTransactionHistoryService: GetTransactionHistoryService,
  ) {}

  async getBalance(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const result = await this.getBalanceService.execute(orgId, auth.userId, auth.role)
    return ctx.json(result)
  }

  async getTransactions(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const page = ctx.getQuery('page') ? parseInt(ctx.getQuery('page')!, 10) : 1
    const limit = ctx.getQuery('limit') ? parseInt(ctx.getQuery('limit')!, 10) : 20
    const result = await this.getTransactionHistoryService.execute(orgId, auth.userId, auth.role, page, limit)
    return ctx.json(result)
  }

  async topUp(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const body = await ctx.getJsonBody<{ amount?: string; description?: string }>()
    const result = await this.topUpService.execute({
      orgId,
      amount: body.amount ?? '0',
      description: body.description,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    const status = result.success ? 200 : 400
    return ctx.json(result, status)
  }
}
