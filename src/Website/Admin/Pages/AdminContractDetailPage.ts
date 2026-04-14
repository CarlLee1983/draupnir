import type { ActivateContractService } from '@/Modules/Contract/Application/Services/ActivateContractService'
import type { GetContractDetailService } from '@/Modules/Contract/Application/Services/GetContractDetailService'
import type { TerminateContractService } from '@/Modules/Contract/Application/Services/TerminateContractService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

/**
 * Admin contract detail with activate/terminate actions (`Admin/Contracts/Show`).
 */
export class AdminContractDetailPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getDetailService: GetContractDetailService,
    private readonly activateContractService: ActivateContractService,
    private readonly terminateContractService: TerminateContractService,
  ) {}

  /**
   * @param ctx - Route param `id` = contract id.
   * @returns Inertia detail payload or auth failure response.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    const contractId = ctx.getParam('id')
    if (!contractId) {
      return this.inertia.render(ctx, 'Admin/Contracts/Show', {
        contract: null,
        error: { key: 'admin.contracts.missingId' },
      })
    }

    const result = await this.getDetailService.execute(contractId, auth.role)

    return this.inertia.render(ctx, 'Admin/Contracts/Show', {
      contract: result.success ? (result.data as Record<string, unknown>) : null,
      error: result.success ? null : { key: 'admin.contracts.loadFailed' },
    })
  }

  /**
   * POST `/admin/contracts/:id/action`: body `{ action: 'activate' | 'terminate' }`.
   *
   * @param ctx - Route param `id`; JSON body selects lifecycle transition.
   * @returns Redirect to the same contract detail path.
   */
  async postAction(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const contractId = ctx.getParam('id')
    if (!contractId) {
      return ctx.redirect('/admin/contracts')
    }

    const body = await ctx.getJsonBody<{ action?: string }>()
    if (body.action === 'activate') {
      await this.activateContractService.execute(contractId, auth.role)
    } else if (body.action === 'terminate') {
      await this.terminateContractService.execute(contractId, auth.role)
    }

    return ctx.redirect(`/admin/contracts/${contractId}`)
  }
}
