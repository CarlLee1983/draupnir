import {
  createRoleMiddleware,
  requireAuth,
} from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { OrganizationController } from '../Controllers/OrganizationController'
import { requireOrganizationContext } from '../Middleware/OrganizationMiddleware'
import {
  AcceptInvitationRequest,
  ChangeMemberRoleRequest,
  ChangeOrgStatusRequest,
  CreateOrganizationRequest,
  InviteMemberRequest,
  UpdateOrganizationRequest,
} from '../Requests'

export async function registerOrganizationRoutes(
  router: IModuleRouter,
  controller: OrganizationController,
): Promise<void> {
  router.post(
    '/api/organizations',
    [createRoleMiddleware('admin')],
    CreateOrganizationRequest,
    (ctx) => controller.create(ctx),
  )
  router.get('/api/organizations', [createRoleMiddleware('admin')], (ctx) => controller.list(ctx))
  router.get('/api/organizations/:id', [requireOrganizationContext()], (ctx) => controller.get(ctx))
  router.put(
    '/api/organizations/:id',
    [createRoleMiddleware('admin')],
    UpdateOrganizationRequest,
    (ctx) => controller.update(ctx),
  )
  router.patch(
    '/api/organizations/:id/status',
    [createRoleMiddleware('admin')],
    ChangeOrgStatusRequest,
    (ctx) => controller.changeStatus(ctx),
  )

  router.get('/api/organizations/:id/members', [requireOrganizationContext()], (ctx) =>
    controller.listMembers(ctx),
  )
  router.post(
    '/api/organizations/:id/invitations',
    [requireOrganizationContext()],
    InviteMemberRequest,
    (ctx) => controller.invite(ctx),
  )
  router.get('/api/organizations/:id/invitations', [requireOrganizationContext()], (ctx) =>
    controller.listInvitations(ctx),
  )
  router.delete(
    '/api/organizations/:id/invitations/:invId',
    [requireOrganizationContext()],
    (ctx) => controller.cancelInvitation(ctx),
  )

  router.post('/api/invitations/:token/accept', [requireAuth()], AcceptInvitationRequest, (ctx) =>
    controller.acceptInvitation(ctx),
  )

  router.delete('/api/organizations/:id/members/:userId', [requireOrganizationContext()], (ctx) =>
    controller.removeMember(ctx),
  )
  router.patch(
    '/api/organizations/:id/members/:userId/role',
    [createRoleMiddleware('admin'), requireOrganizationContext()],
    ChangeMemberRoleRequest,
    (ctx) => controller.changeMemberRole(ctx),
  )
}
