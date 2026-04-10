import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'

/**
 * Registers test-only utility routes for seeding or modifying user data.
 * These routes are typically only registered when running with an in-memory database.
 */
export function registerTestSeedRoutes(router: IModuleRouter, db: IDatabaseAccess): void {
  /**
   * Explicitly sets a user's role.
   * `PATCH /api/__test__/seed-role`
   */
  router.patch('/api/__test__/seed-role', async (ctx) => {
    const body = (await ctx.getJsonBody()) as { userId?: string; role?: string }
    if (!body.userId || !body.role) {
      return ctx.json({ success: false, error: 'userId and role required' }, 400)
    }

    await db.table('users').where('id', '=', body.userId).update({ role: body.role })

    return ctx.json({ success: true, message: `Role set to ${body.role}` })
  })
}
