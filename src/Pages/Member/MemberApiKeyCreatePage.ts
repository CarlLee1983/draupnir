import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { CreateApiKeyService } from '@/Modules/ApiKey/Application/Services/CreateApiKeyService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class MemberApiKeyCreatePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly createService: CreateApiKeyService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')

    return this.inertia.render(ctx, 'Member/ApiKeys/Create', {
      orgId: orgId ?? null,
      createdKey: null,
      formError: null,
    })
  }

  /** POST /member/api-keys — Inertia 表單（伺服端帶 JWT，避免瀏覽器 fetch 無法附 Bearer） */
  async store(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

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
        formError: '缺少 orgId',
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
      formError: result.message ?? '建立失敗',
    })
  }
}
