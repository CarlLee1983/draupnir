import type { CreateApiKeyService } from '@/Modules/ApiKey/Application/Services/CreateApiKeyService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireMember } from './helpers/requireMember'

/**
 * Member flow to create an API key within an org (`Member/ApiKeys/Create`).
 */
export class MemberApiKeyCreatePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly createService: CreateApiKeyService,
  ) {}

  /**
   * @returns Create form with optional `orgId` from query or header.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireMember(ctx)
    if (!check.ok) return check.response!

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')

    return this.inertia.render(ctx, 'Member/ApiKeys/Create', {
      orgId: orgId ?? null,
      createdKey: null,
      formError: null,
    })
  }

  /**
   * POST `/member/api-keys`: creates a key from JSON body (`orgId`, `label`, rate limits).
   *
   * @returns Re-renders create page with `createdKey` on success or `formError` on failure.
   */
  async store(ctx: IHttpContext): Promise<Response> {
    const check = requireMember(ctx)
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
        formError: messages['member.apiKeys.missingOrgId'],
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
      formError: result.message ?? messages['member.apiKeys.createFailed'],
    })
  }
}
