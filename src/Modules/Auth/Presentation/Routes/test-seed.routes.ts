import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

/**
 * Test-only seed routes. Only registered when ORM=memory.
 */
export function registerTestSeedRoutes(router: IModuleRouter, db: IDatabaseAccess): void {
	router.patch('/api/__test__/seed-role', async (ctx) => {
		const body = (await ctx.getJsonBody()) as { userId?: string; role?: string }
		if (!body.userId || !body.role) {
			return ctx.json({ success: false, error: 'userId and role required' }, 400)
		}

		await db.table('users').where('id', '=', body.userId).update({ role: body.role })

		return ctx.json({ success: true, message: `Role set to ${body.role}` })
	})
}
