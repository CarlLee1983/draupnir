// src/Modules/Contract/Presentation/Controllers/ContractController.ts

import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { ActivateContractService } from '../../Application/Services/ActivateContractService'
import type { AssignContractService } from '../../Application/Services/AssignContractService'
import type { CreateContractService } from '../../Application/Services/CreateContractService'
import type { GetContractDetailService } from '../../Application/Services/GetContractDetailService'
import type { HandleContractExpiryService } from '../../Application/Services/HandleContractExpiryService'
import type { ListContractsService } from '../../Application/Services/ListContractsService'
import type { RenewContractService } from '../../Application/Services/RenewContractService'
import type { TerminateContractService } from '../../Application/Services/TerminateContractService'
import type { UpdateContractService } from '../../Application/Services/UpdateContractService'
import type {
  AssignContractParams,
  CreateContractParams,
  ListContractsQueryParams,
  RenewContractParams,
  UpdateContractParams,
} from '../Requests'

/** HTTP adapter for contract commands and queries; delegates to application services. */
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

  /** POST /api/contracts — creates a contract for an admin-authenticated caller. */
  async create(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
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

  /** POST /api/contracts/:contractId/activate — activates a contract when allowed. */
  async activate(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: 'Missing contractId' }, 400)
    const result = await this.activateService.execute(contractId, auth.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  /** PUT /api/contracts/:contractId — updates DRAFT terms. */
  async update(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: 'Missing contractId' }, 400)
    const body = ctx.get('validated') as UpdateContractParams
    const result = await this.updateService.execute({
      contractId,
      terms: body.terms,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    return ctx.json(result, result.success ? 200 : 400)
  }

  /** POST /api/contracts/:contractId/assign — reassigns a DRAFT contract target. */
  async assign(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: 'Missing contractId' }, 400)
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

  /** POST /api/contracts/:contractId/terminate — terminates a contract. */
  async terminate(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: 'Missing contractId' }, 400)
    const result = await this.terminateService.execute(contractId, auth.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  /** POST /api/contracts/:contractId/renew — renews an ACTIVE contract with new terms. */
  async renew(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: 'Missing contractId' }, 400)
    const body = ctx.get('validated') as RenewContractParams
    const result = await this.renewService.execute(contractId, body.terms, auth.userId, auth.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  /** POST /api/contracts/handle-expiry — admin-only job hook for expiring/expired processing. */
  async handleExpiry(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    if (auth.role !== 'admin') {
      return ctx.json(
        { success: false, message: 'Only admins can perform this action', error: 'FORBIDDEN' },
        403,
      )
    }
    const counts = await this.handleContractExpiryService.execute()
    return ctx.json({ success: true, message: 'Contract expiry check processed', data: counts })
  }

  /** GET /api/contracts — lists contracts for `targetId` with org membership checks for non-admins. */
  async list(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const query = ctx.get('validated') as ListContractsQueryParams
    const result = await this.listService.execute(query.targetId, auth.userId, auth.role)
    return ctx.json(result)
  }

  /** GET /api/contracts/:contractId — returns one contract for admins. */
  async getDetail(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const contractId = ctx.getParam('contractId')
    if (!contractId) return ctx.json({ success: false, message: 'Missing contractId' }, 400)
    const result = await this.getDetailService.execute(contractId, auth.role)
    const status = result.success ? 200 : result.error === 'NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }
}
