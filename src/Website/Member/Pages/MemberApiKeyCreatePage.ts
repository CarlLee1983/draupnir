import type { CreateApiKeyService } from '@/Modules/ApiKey/Application/Services/CreateApiKeyService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
/**
 * Page handler for creating API keys.
 *
 * Path: `/member/api-keys/create`
 * React Page: `Member/ApiKeys/Create`
 */
export class MemberApiKeyCreatePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly createService: CreateApiKeyService,
  ) {}

  /**
   * Displays the creation form for a new API key.
   *
   * @param ctx - Context for retrieving the initial organization ID.
   * @returns Inertia render response with the form.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')

    return this.inertia.render(ctx, 'Member/ApiKeys/Create', {
      orgId: orgId ?? null,
      createdKey: null,
      formError: null,
    })
  }

  /**
   * Creates a new API key based on the provided JSON body.
   *
   * @param ctx - Context containing key parameters (label, rate limits).
   * @returns Inertia render with result or validation error.
   */
  async store(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    const body = await ctx.getJsonBody<{
      orgId?: string
      label?: string
      rateLimitRpm?: number | string
      rateLimitTpm?: number | string
    }>()

    const orgId = typeof body.orgId === 'string' ? body.orgId : undefined
    const label = typeof body.label === 'string' ? body.label : ''
    const rateLimitRpm = Number(body.rateLimitRpm ?? 60)
    const rateLimitTpm = Number(body.rateLimitTpm ?? 10_000)

    if (!orgId) {
      return this.inertia.render(ctx, 'Member/ApiKeys/Create', {
        orgId: null,
        createdKey: null,
        formError: { key: 'member.apiKeys.missingOrgId' },
      })
    }

    const result = await this.createService.execute({
      orgId,
      createdByUserId: auth.userId,
      callerSystemRole: auth.role,
      label,
      rateLimitRpm: Number.isFinite(rateLimitRpm) ? rateLimitRpm : 60,
      rateLimitTpm: Number.isFinite(rateLimitTpm) ? rateLimitTpm : 10_000,
    })

    if (result.success && result.data && typeof result.data.rawKey === 'string') {
      return this.inertia.render(ctx, 'Member/ApiKeys/Create', {
        orgId,
        createdKey: result.data.rawKey,
        formError: null,
      })
    }

    return this.inertia.render(ctx, 'Member/ApiKeys/Create', {
      orgId,
      createdKey: null,
      formError: { key: 'member.apiKeys.createFailed' },
    })
  }
}
