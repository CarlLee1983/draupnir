import type { CreateContractService } from '@/Modules/Contract/Application/Services/CreateContractService'
import type { CreateContractParams } from '@/Modules/Contract/Presentation/Requests/CreateContractRequest'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Admin contract creation form and submit handler (`Admin/Contracts/Create`).
 */
export class AdminContractCreatePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly createContractService: CreateContractService,
  ) {}

  /**
   * @returns Empty create form (Inertia).
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    return this.inertia.render(ctx, 'Admin/Contracts/Create', {
      formError: null,
    })
  }

  /**
   * POST `/admin/contracts`: uses `CreateContractRequest` validated body.
   *
   * @param ctx - HTTP context (`validated` injected by `CreateContractRequest`).
   * @returns Redirect to contract list on success or re-render with `formError`.
   */
  async store(ctx: IHttpContext): Promise<Response> {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const body = ctx.get('validated') as CreateContractParams | undefined

    if (!body) {
      return this.inertia.render(ctx, 'Admin/Contracts/Create', {
        formError: { key: 'admin.contracts.validationFailed' },
      })
    }

    const result = await this.createContractService.execute({
      targetType: body.targetType,
      targetId: body.targetId,
      terms: {
        creditQuota: body.terms.creditQuota,
        allowedModules: body.terms.allowedModules,
        rateLimit: {
          rpm: Number(body.terms.rateLimit?.rpm ?? 0),
          tpm: Number(body.terms.rateLimit?.tpm ?? 0),
        },
        validityPeriod: {
          startDate: body.terms.validityPeriod.startDate,
          endDate: body.terms.validityPeriod.endDate,
        },
      },
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })

    if (result.success && result.data && typeof (result.data as { id?: string }).id === 'string') {
      const id = (result.data as { id: string }).id
      return ctx.redirect(`/admin/contracts/${id}`)
    }

    return this.inertia.render(ctx, 'Admin/Contracts/Create', {
      formError: result.success ? null : { key: 'admin.contracts.createFailed' },
    })
  }
}
