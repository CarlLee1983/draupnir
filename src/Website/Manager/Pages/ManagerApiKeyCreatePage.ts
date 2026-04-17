import type { AssignApiKeyService } from '@/Modules/ApiKey/Application/Services/AssignApiKeyService'
import type { CreateApiKeyService } from '@/Modules/ApiKey/Application/Services/CreateApiKeyService'
import type { SumQuotaAllocatedForOrgService } from '@/Modules/ApiKey/Application/Services/SumQuotaAllocatedForOrgService'
import type { GetActiveOrgContractQuotaService } from '@/Modules/Contract/Application/Services/GetActiveOrgContractQuotaService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { setFlash } from '@/Website/Http/Inertia/SharedPropsBuilder'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Shape of the validated POST body for creating an API key, set on `ctx` by `ManagerCreateApiKeyRequest`.
 * If the route does not use that request, `validated` is unset and callers only see `{ label: '' }`.
 */
interface CreateForm {
  /** Human-readable label */
  label: string
  /** Optional per-key quota cap; with `budgetResetPeriod`, persisted as budget fields */
  quotaAllocated?: number
  /** Budget reset cadence; meaningful only when `quotaAllocated` is set */
  budgetResetPeriod?: '7d' | '30d'
  /** Optional org `member` user id to assign the key to after creation */
  assigneeUserId?: string | null
}

/**
 * Manager UI for creating an API key (Inertia).
 *
 * Paths:
 * - GET `/manager/api-keys/create` — render create form
 * - POST `/manager/api-keys` — create key with optional quota and assignee; route must use `ManagerCreateApiKeyRequest` or `validated` stays empty
 *
 * React page: `Manager/ApiKeys/Create`
 *
 * Resolves the signed-in user’s org membership, loads assignees (`role === 'member'` only), active contract quota,
 * and total allocated quota. When `quotaAllocated` is sent, it is checked against remaining pool before create.
 * On success, optionally assigns the key and re-renders the same page with a one-time `newKeyValue` (plaintext key).
 */
export class ManagerApiKeyCreatePage {
  /**
   * @param inertia - Inertia render service
   * @param createApiKeyService - Creates API keys
   * @param assignApiKeyService - Optional post-create assignee
   * @param listMembersService - Lists org members for the assignee picker
   * @param membershipService - Resolves org for the signed-in user
   * @param contractQuotaService - Active contract quota for the org
   * @param sumAllocatedService - Sum of allocated quota (for availability checks)
   */
  constructor(
    private readonly inertia: InertiaService,
    private readonly createApiKeyService: CreateApiKeyService,
    private readonly assignApiKeyService: AssignApiKeyService,
    private readonly listMembersService: ListMembersService,
    private readonly membershipService: GetUserMembershipService,
    private readonly contractQuotaService: GetActiveOrgContractQuotaService,
    private readonly sumAllocatedService: SumQuotaAllocatedForOrgService,
  ) {}

  /**
   * Resolves org id from session-backed membership; redirects to the member dashboard if none.
   *
   * @param ctx - HTTP context (auth middleware must have run)
   * @returns Org id or a redirect `Response`
   */
  private async resolveOrgId(
    ctx: IHttpContext,
  ): Promise<{ orgId: string } | { redirect: Response }> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.membershipService.execute(auth.userId)
    if (!membership) return { redirect: ctx.redirect('/member/dashboard') }
    return { orgId: membership.orgId }
  }

  /**
   * GET: render create-form props (assignees, contract quota, total allocated).
   *
   * @param ctx - HTTP context
   * @returns Inertia HTML, or redirect when membership is missing
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect
    const [members, quotaResult, allocatedResult] = await Promise.all([
      this.listMembersService.execute(r.orgId, auth.userId, auth.role),
      this.contractQuotaService.execute(r.orgId, auth.userId, auth.role),
      this.sumAllocatedService.execute(r.orgId, auth.userId, auth.role),
    ])
    const assignees = members.success
      ? ((members.data?.members ?? []) as Array<{ userId: string; role: string; email?: string }>)
          .filter((m) => m.role === 'member')
          .map((m) => ({
            userId: m.userId,
            email: typeof m.email === 'string' ? m.email : '',
          }))
      : []
    return this.inertia.render(ctx, 'Manager/ApiKeys/Create', {
      orgId: r.orgId,
      assignees,
      contractQuota: quotaResult.success ? (quotaResult.data?.contractQuota ?? null) : null,
      totalAllocated: allocatedResult.success ? (allocatedResult.data?.totalAllocated ?? null) : null,
    })
  }

  /**
   * POST: create an API key from the validated body; optional quota check and assignee; on success re-renders
   * the same page with `newKeyValue`. Flashes an error and redirects back when quota exceeds availability or create fails.
   *
   * @param ctx - HTTP context (`validated` should be injected by `ManagerCreateApiKeyRequest`)
   * @returns Inertia HTML including a one-time `newKeyValue`, or a redirect
   */
  async store(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect
    const body = (ctx.get('validated') as CreateForm | undefined) ?? { label: '' }

    if (body.quotaAllocated != null) {
      const [quotaResult, allocatedResult] = await Promise.all([
        this.contractQuotaService.execute(r.orgId, auth.userId, auth.role),
        this.sumAllocatedService.execute(r.orgId, auth.userId, auth.role),
      ])
      if (quotaResult.success && allocatedResult.success) {
        const available =
          (quotaResult.data?.contractQuota ?? 0) - (allocatedResult.data?.totalAllocated ?? 0)
        if (body.quotaAllocated > available) {
          setFlash(ctx, 'error', {
            key: 'manager.apiKeys.quotaExceedsAvailable',
            params: { available: String(available) },
          })
          return ctx.redirect('/manager/api-keys/create')
        }
      }
    }

    const created = await this.createApiKeyService.execute({
      orgId: r.orgId,
      createdByUserId: auth.userId,
      callerSystemRole: auth.role,
      label: body.label,
      budgetMaxLimit: body.quotaAllocated,
      budgetResetPeriod: body.quotaAllocated != null ? body.budgetResetPeriod : undefined,
    })

    const createdKeyId =
      created.success && created.data && typeof created.data.id === 'string'
        ? (created.data.id as string)
        : null
    const newKeyValue =
      created.success && created.data && typeof created.data.rawKey === 'string'
        ? (created.data.rawKey as string)
        : null

    if (!createdKeyId || !newKeyValue) {
      const detail =
        typeof created.message === 'string' && created.message.trim().length > 0
          ? created.message.trim()
          : (created.error ?? 'Unknown error')
      setFlash(ctx, 'error', {
        key: 'manager.apiKeys.createFailed',
        params: { message: detail },
      })
      return ctx.redirect('/manager/api-keys/create')
    }

    if (body.assigneeUserId && body.assigneeUserId.length > 0) {
      await this.assignApiKeyService.execute({
        keyId: createdKeyId,
        orgId: r.orgId,
        assigneeUserId: body.assigneeUserId,
        callerUserId: auth.userId,
        callerSystemRole: auth.role,
      })
    }

    const [members, quotaResult, allocatedResult] = await Promise.all([
      this.listMembersService.execute(r.orgId, auth.userId, auth.role),
      this.contractQuotaService.execute(r.orgId, auth.userId, auth.role),
      this.sumAllocatedService.execute(r.orgId, auth.userId, auth.role),
    ])
    const assignees = members.success
      ? ((members.data?.members ?? []) as Array<{ userId: string; role: string; email?: string }>)
          .filter((m) => m.role === 'member')
          .map((m) => ({
            userId: m.userId,
            email: typeof m.email === 'string' ? m.email : '',
          }))
      : []
    return this.inertia.render(ctx, 'Manager/ApiKeys/Create', {
      orgId: r.orgId,
      assignees,
      contractQuota: quotaResult.success ? (quotaResult.data?.contractQuota ?? null) : null,
      totalAllocated: allocatedResult.success ? (allocatedResult.data?.totalAllocated ?? null) : null,
      newKeyValue,
    })
  }
}
