import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import { AuthTokenRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthTokenRepository'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'

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
			return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
		}

		const organizationId = extractOrganizationId(ctx)
		if (!organizationId) {
			return ctx.json(
				{ success: false, message: '缺少組織 ID', error: 'MISSING_ORGANIZATION_ID' },
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
					message: '組織權限不足',
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
