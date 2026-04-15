import type { KeyBudgetResetPeriod } from '@/Modules/ApiKey/Application/DTOs/ApiKeyDTO'
import type { UpdateApiKeyBudgetService } from '@/Modules/ApiKey/Application/Services/UpdateApiKeyBudgetService'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Member UI: view and update gateway spend cap (7d / 30d reset) for an API key.
 *
 * Paths: `GET /member/api-keys/:keyId/budget`, `POST /member/api-keys/:keyId/budget`
 * React: `Member/ApiKeys/Budget`
 */
export class MemberApiKeyBudgetPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly updateBudgetService: UpdateApiKeyBudgetService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const keyId = ctx.getParam('keyId')
    const orgIdQuery = ctx.getQuery('orgId') ?? null

    if (!keyId) {
      return this.inertia.render(ctx, 'Member/ApiKeys/Budget', {
        orgId: orgIdQuery,
        keyId: null,
        keyLabel: null,
        formError: { key: 'member.apiKeys.keyNotFound' },
      })
    }

    const entity = await this.apiKeyRepository.findById(keyId)
    if (!entity) {
      return this.inertia.render(ctx, 'Member/ApiKeys/Budget', {
        orgId: orgIdQuery,
        keyId,
        keyLabel: null,
        formError: { key: 'member.apiKeys.keyNotFound' },
      })
    }

    const orgId = entity.orgId
    const authResult = await this.orgAuth.requireOrgMembership(
      orgId,
      auth.userId,
      auth.role,
    )
    if (!authResult.authorized) {
      return this.inertia.render(ctx, 'Member/ApiKeys/Budget', {
        orgId,
        keyId,
        keyLabel: null,
        formError: { key: 'member.apiKeys.loadFailed' },
      })
    }

    return this.inertia.render(ctx, 'Member/ApiKeys/Budget', {
      orgId,
      keyId,
      keyLabel: entity.label,
      formError: null,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const keyId = ctx.getParam('keyId')

    const body = await ctx.getJsonBody<{
      orgId?: string
      budgetMaxLimit?: number | string
      budgetResetPeriod?: string
    }>()

    const orgId = typeof body.orgId === 'string' ? body.orgId : undefined
    const budgetMaxLimit = Number(body.budgetMaxLimit)
    const periodRaw = body.budgetResetPeriod
    const budgetResetPeriod =
      periodRaw === '7d' || periodRaw === '30d' ? (periodRaw as KeyBudgetResetPeriod) : undefined

    if (!keyId || !orgId) {
      return this.inertia.render(ctx, 'Member/ApiKeys/Budget', {
        orgId: orgId ?? null,
        keyId: keyId ?? null,
        keyLabel: null,
        formError: { key: 'member.apiKeys.missingOrgId' },
      })
    }

    const entity = await this.apiKeyRepository.findById(keyId)
    const keyLabel = entity?.label ?? null

    if (budgetResetPeriod === undefined) {
      return this.inertia.render(ctx, 'Member/ApiKeys/Budget', {
        orgId,
        keyId,
        keyLabel,
        formError: { key: 'member.apiKeys.budgetPeriodRequired' },
      })
    }

    const result = await this.updateBudgetService.execute({
      keyId,
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      budgetMaxLimit,
      budgetResetPeriod,
    })

    if (result.success) {
      const q = `?orgId=${encodeURIComponent(orgId)}`
      return ctx.redirect(`/member/api-keys${q}`)
    }

    const errorKey =
      result.error === 'NOT_FOUND'
        ? 'member.apiKeys.keyNotFound'
        : result.error === 'NOT_ORG_MEMBER' || result.error === 'ORG_MISMATCH'
          ? 'member.apiKeys.loadFailed'
          : result.error === 'KEY_NOT_UPDATABLE'
            ? 'member.apiKeys.keyNotUpdatable'
            : 'member.apiKeys.budgetUpdateFailed'

    return this.inertia.render(ctx, 'Member/ApiKeys/Budget', {
      orgId,
      keyId,
      keyLabel,
      formError: { key: errorKey },
    })
  }
}
