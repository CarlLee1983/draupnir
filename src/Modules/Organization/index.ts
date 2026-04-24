/**
 * Organization module public surface.
 *
 * Re-exports application services, domain aggregates/entities, and 
 * infrastructure providers to facilitate cross-module communication 
 * and define the module's public boundary.
 */

export { AcceptInvitationService } from './Application/Services/AcceptInvitationService'
export { CancelInvitationService } from './Application/Services/CancelInvitationService'
export { ChangeOrgMemberRoleService } from './Application/Services/ChangeOrgMemberRoleService'
export { ChangeOrgStatusService } from './Application/Services/ChangeOrgStatusService'
export { CreateOrganizationService } from './Application/Services/CreateOrganizationService'
export { GetOrganizationService } from './Application/Services/GetOrganizationService'
export { InviteMemberService } from './Application/Services/InviteMemberService'
export { ListInvitationsService } from './Application/Services/ListInvitationsService'
export { ListMembersService } from './Application/Services/ListMembersService'
export { ListOrganizationsService } from './Application/Services/ListOrganizationsService'
export { OrgAuthorizationHelper } from './Application/Services/OrgAuthorizationHelper'
export { RemoveMemberService } from './Application/Services/RemoveMemberService'
export { UpdateOrganizationService } from './Application/Services/UpdateOrganizationService'
export { Organization } from './Domain/Aggregates/Organization'
export { OrganizationInvitation } from './Domain/Entities/OrganizationInvitation'
export { OrganizationMember } from './Domain/Entities/OrganizationMember'
export type { IOrganizationInvitationRepository } from './Domain/Repositories/IOrganizationInvitationRepository'
export type { IOrganizationMemberRepository } from './Domain/Repositories/IOrganizationMemberRepository'
export type { IOrganizationRepository } from './Domain/Repositories/IOrganizationRepository'
export { InvitationStatus, InvitationStatusType } from './Domain/ValueObjects/InvitationStatus'
export { OrgMemberRole, OrgMemberRoleType } from './Domain/ValueObjects/OrgMemberRole'
export { OrgSlug } from './Domain/ValueObjects/OrgSlug'

export { OrganizationServiceProvider } from './Infrastructure/Providers/OrganizationServiceProvider'

export { OrganizationController } from './Presentation/Controllers/OrganizationController'
export { registerOrganizationRoutes } from './Presentation/Routes/organization.routes'
