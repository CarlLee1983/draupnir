// src/Modules/Credit/Presentation/Controllers/CreditController.ts
/**
 * CreditController
 * Presentation: handles HTTP endpoints for credit management.
 */

import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { GetBalanceService } from '../../Application/Services/GetBalanceService'
import type { GetTransactionHistoryService } from '../../Application/Services/GetTransactionHistoryService'
import type { RefundCreditService } from '../../Application/Services/RefundCreditService'
import type { TopUpCreditService } from '../../Application/Services/TopUpCreditService'
import type { RefundParams, TopUpParams } from '../Requests'

/**
 * Controller for organization credit operations.
 */
export class CreditController {
  constructor(
    private readonly topUpService: TopUpCreditService,
    private readonly getBalanceService: GetBalanceService,
    private readonly getTransactionHistoryService: GetTransactionHistoryService,
    private readonly refundService: RefundCreditService,
  ) {}

  /** Retrieves the current credit balance for an organization. */
  async getBalance(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const result = await this.getBalanceService.execute(orgId, auth.userId, auth.role)
    return ctx.json(result)
  }

  /** Retrieves a paginated list of credit transactions. */
  async getTransactions(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const page = ctx.getQuery('page') ? parseInt(ctx.getQuery('page')!, 10) : 1
    const limit = ctx.getQuery('limit') ? parseInt(ctx.getQuery('limit')!, 10) : 20
    const result = await this.getTransactionHistoryService.execute(
      orgId,
      auth.userId,
      auth.role,
      page,
      limit,
    )
    return ctx.json(result)
  }

  /** Adds credits to an organization's account. */
  async topUp(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const body = ctx.get('validated') as TopUpParams
    const result = await this.topUpService.execute({
      orgId,
      amount: body.amount,
      description: body.description,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    return ctx.json(result, result.success ? 200 : 400)
  }

  /** Refunds credits for a specific transaction or reference. */
  async refund(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const body = ctx.get('validated') as RefundParams
    const result = await this.refundService.execute({
      orgId,
      amount: body.amount,
      referenceType: body.referenceType,
      referenceId: body.referenceId,
      description: body.description,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    return ctx.json(result, result.success ? 200 : 400)
  }
}
