import type { CreateContractService } from '@/Modules/Contract/Application/Services/CreateContractService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireAdmin } from './helpers/requireAdmin'

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
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    return this.inertia.render(ctx, 'Admin/Contracts/Create', {
      formError: null,
    })
  }

  /**
   * POST `/admin/contracts`: parses JSON body and calls `CreateContractService.execute`.
   *
   * @param ctx - JSON body with target and terms; uses admin JWT from context.
   * @returns Redirect to contract list on success or re-render with `formError`.
   */
  async store(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

    const shared = ctx.get('inertia:shared') as
      | {
          locale: 'zh-TW' | 'en'
          messages: Record<string, string>
        }
      | undefined
    const messages = shared?.messages ?? {}

    const body = await ctx.getJsonBody<{
      targetType?: string
      targetId?: string
      terms?: {
        creditQuota?: number
        allowedModules?: string[]
        rateLimit?: { rpm?: number; tpm?: number }
        validityPeriod?: { startDate?: string; endDate?: string }
      }
    }>()

    const targetType = body.targetType === 'user' ? 'user' : 'organization'
    const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : ''
    const terms = body.terms

    if (
      !targetId ||
      !terms?.validityPeriod?.startDate ||
      !terms.validityPeriod.endDate ||
      typeof terms.creditQuota !== 'number' ||
      !terms.allowedModules?.length
    ) {
      return this.inertia.render(ctx, 'Admin/Contracts/Create', {
        formError: messages['admin.contracts.validationFailed'],
      })
    }

    const result = await this.createContractService.execute({
      targetType,
      targetId,
      terms: {
        creditQuota: terms.creditQuota,
        allowedModules: terms.allowedModules,
        rateLimit: {
          rpm: Number(terms.rateLimit?.rpm ?? 0),
          tpm: Number(terms.rateLimit?.tpm ?? 0),
        },
        validityPeriod: {
          startDate: terms.validityPeriod.startDate,
          endDate: terms.validityPeriod.endDate,
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
      formError: result.message ?? messages['admin.contracts.createFailed'],
    })
  }
}
