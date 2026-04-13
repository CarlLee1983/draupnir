export interface CreateOrganizationRequest {
  name: string
  description?: string
  slug?: string
  managerUserId: string
}

export interface UpdateOrganizationRequest {
  name?: string
  description?: string
}

export interface InviteMemberRequest {
  email: string
  role?: string
}

export interface AcceptInvitationRequest {
  token: string
}

export interface ChangeMemberRoleRequest {
  newRole: string
}

export interface ChangeOrgStatusRequest {
  status: string
}
