import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { OrganizationController } from '../Controllers/OrganizationController'
import { requireAuth, createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export async function registerOrganizationRoutes(
	router: IModuleRouter,
	controller: OrganizationController,
): Promise<void> {
	router.post('/api/organizations', [createRoleMiddleware('admin')], (ctx) => controller.create(ctx))
	router.get('/api/organizations', [createRoleMiddleware('admin')], (ctx) => controller.list(ctx))
	router.get('/api/organizations/:id', [requireAuth()], (ctx) => controller.get(ctx))
	router.put('/api/organizations/:id', [createRoleMiddleware('admin')], (ctx) => controller.update(ctx))
	router.patch('/api/organizations/:id/status', [createRoleMiddleware('admin')], (ctx) => controller.changeStatus(ctx))

	router.get('/api/organizations/:id/members', [requireAuth()], (ctx) => controller.listMembers(ctx))
	router.post('/api/organizations/:id/invitations', [requireAuth()], (ctx) => controller.invite(ctx))
	router.get('/api/organizations/:id/invitations', [requireAuth()], (ctx) => controller.listInvitations(ctx))
	router.delete('/api/organizations/:id/invitations/:invId', [requireAuth()], (ctx) =>
		controller.cancelInvitation(ctx),
	)

	router.post('/api/invitations/:token/accept', [requireAuth()], (ctx) => controller.acceptInvitation(ctx))

	router.delete('/api/organizations/:id/members/:userId', [requireAuth()], (ctx) => controller.removeMember(ctx))
	router.patch('/api/organizations/:id/members/:userId/role', [createRoleMiddleware('admin')], (ctx) =>
		controller.changeMemberRole(ctx),
	)
}
