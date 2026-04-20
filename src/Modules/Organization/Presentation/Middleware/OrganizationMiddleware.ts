import type { ProvisionOrganizationDefaultsService } from '@/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService'
import { AuthTokenRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthTokenRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import { getCurrentContainer } from '@/wiring/CurrentContainer'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'

export interface CurrentOrganizationContext {
  organizationId: string
  userId: string
  role: string
  isAdmin: boolean
}

let jwtParser: AuthMiddleware | null = null
let orgAuthHelper: OrgAuthorizationHelper | null = null

function getJwtParser(): AuthMiddleware {
  if (!jwtParser) {
    jwtParser = new AuthMiddleware(new AuthTokenRepository(getCurrentDatabaseAccess()))
  }
  return jwtParser
}

function getOrgAuthHelper(): OrgAuthorizationHelper {
  if (!orgAuthHelper) {
    orgAuthHelper = new OrgAuthorizationHelper(
      new OrganizationMemberRepository(getCurrentDatabaseAccess()),
    )
  }
  return orgAuthHelper
}

function extractOrganizationId(ctx: Parameters<Middleware>[0]): string | null {
  return (
    ctx.getHeader('x-organization-id') ??
    ctx.getHeader('X-Organization-Id') ??
    ctx.getHeader('organization-id') ??
    ctx.getParam('orgId') ??
    ctx.getParam('id') ??
    null
  )
}

/**
 * 補償機制：如果組織缺少 gateway_team_id，立即嘗試修復。
 * 若修復失敗（例如 Bifrost 仍然斷線），則阻止後續操作，避免產生 unscoped keys。
 */
async function autoRepairOrganizationGatewayTeam(
  organizationId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const container = getCurrentContainer()
  const orgRepo = container.make('organizationRepository') as IOrganizationRepository
  const provisionService = container.make(
    'provisionOrganizationDefaultsService',
  ) as ProvisionOrganizationDefaultsService

  const org = await orgRepo.findById(organizationId)
  if (!org) return { ok: false, error: 'ORG_NOT_FOUND' }

  if (org.gatewayTeamId) {
    return { ok: true }
  }

  console.log(
    `[OrganizationMiddleware] Organization ${organizationId} is missing gatewayTeamId. Triggering auto-repair...`,
  )

  try {
    // execute 是冪等的，會補建 Bifrost Team
    await provisionService.execute(organizationId, userId)

    // 重新檢查
    const updated = await orgRepo.findById(organizationId)
    if (updated?.gatewayTeamId) {
      console.log(
        `[OrganizationMiddleware] Auto-repair successful for organization ${organizationId}`,
      )
      return { ok: true }
    }

    return { ok: false, error: 'BIFROST_PROVISIONING_FAILED' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      `[OrganizationMiddleware] Auto-repair failed for organization ${organizationId}: ${message}`,
    )
    return { ok: false, error: 'BIFROST_PROVISIONING_ERROR' }
  }
}

export function requireOrganizationContext(): Middleware {
  return async (ctx, next) => {
    // Only run the DB-backed token verification when JWT parsing has not already
    // been attempted by an upstream middleware (e.g. attachJwt in webBase()).
    // Guarding on hasParsed() rather than isAuthenticated() ensures we also
    // skip the auth_tokens SELECT for expired / revoked / malformed tokens that
    // attachJwt already tried and failed — preventing the Atlas N+1 warning on
    // both the success path and the failure path.
    if (!AuthMiddleware.hasParsed(ctx)) {
      await getJwtParser().handle(ctx)
    }

    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }

    let organizationId = extractOrganizationId(ctx)

    // ─── 自動解析機制 (Auto-resolve for Managers) ───
    // 如果請求中缺少 Org ID，但使用者是 Manager，則自動尋找其所屬組織
    if (!organizationId && auth.role === 'manager') {
      const container = getCurrentContainer()
      const memberRepo = container.make(
        'organizationMemberRepository',
      ) as IOrganizationMemberRepository
      const membership = await memberRepo.findOrgManagerMembershipByUserId(auth.userId)
      if (membership) {
        organizationId = membership.organizationId
      }
    }

    if (!organizationId) {
      return ctx.json(
        { success: false, message: 'Missing organization ID', error: 'MISSING_ORGANIZATION_ID' },
        400,
      )
    }

    const orgAuth = await getOrgAuthHelper().requireOrgMembership(
      organizationId,
      auth.userId,
      auth.role,
    )
    if (!orgAuth.authorized) {
      return ctx.json(
        {
          success: false,
          message: 'Insufficient organization permissions',
          error: orgAuth.error ?? 'FORBIDDEN',
        },
        403,
      )
    }

    // ─── 自動補建機制 ───
    const repairResult = await autoRepairOrganizationGatewayTeam(organizationId, auth.userId)
    if (!repairResult.ok) {
      return ctx.json(
        {
          success: false,
          message: 'Organization initialization incomplete. Please contact support.',
          error: repairResult.error,
        },
        503, // Service Unavailable (because Bifrost integration is required)
      )
    }

    ctx.set('currentOrg', {
      organizationId,
      userId: auth.userId,
      role: orgAuth.membership?.role ?? auth.role,
      isAdmin: auth.role === 'admin',
    } satisfies CurrentOrganizationContext)

    return next()
  }
}

const MANAGER_SENTINEL = new Response(null, { status: 204 })

export function requireOrganizationManager(): Middleware {
  const orgContext = requireOrganizationContext()
  return async (ctx, next) => {
    const result = await orgContext(ctx, async () => MANAGER_SENTINEL)
    if (result !== MANAGER_SENTINEL) {
      return result
    }

    const current = ctx.get<CurrentOrganizationContext>('currentOrg')
    if (!current || (!current.isAdmin && current.role !== 'manager')) {
      return ctx.json(
        {
          success: false,
          message: 'Insufficient organization permissions',
          error: 'NOT_ORG_MANAGER',
        },
        403,
      )
    }

    // 雖然 requireOrganizationContext 已經檢查過一次，但在這裡確保 currentOrg 已更新
    // (如果 repair 是在 requireOrganizationContext 內完成的，這裡其實是安全的)

    return next()
  }
}
