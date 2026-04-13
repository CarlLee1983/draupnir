import { AuthTokenRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthTokenRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'

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

export function requireOrganizationContext(): Middleware {
  return async (ctx, next) => {
    await getJwtParser().handle(ctx)
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }

    const organizationId = extractOrganizationId(ctx)
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

    return next()
  }
}
