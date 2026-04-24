/**
 * OrganizationMember
 * Domain Entity: represents the relationship between a User and an Organization.
 */

import type { OrgMemberRole } from '../ValueObjects/OrgMemberRole'

/** Properties defining an OrganizationMember's state. */
interface OrganizationMemberProps {
  id: string
  organizationId: string
  userId: string
  role: OrgMemberRole
  joinedAt: Date
  createdAt: Date
}

/**
 * OrganizationMember Entity
 * Handles membership lifecycle and role management within an organization.
 */
export class OrganizationMember {
  private readonly props: OrganizationMemberProps

  private constructor(props: OrganizationMemberProps) {
    this.props = props
  }

  /** Creates a new organization member with current timestamp. */
  static create(
    id: string,
    organizationId: string,
    userId: string,
    role: OrgMemberRole,
  ): OrganizationMember {
    return new OrganizationMember({
      id,
      organizationId,
      userId,
      role,
      joinedAt: new Date(),
      createdAt: new Date(),
    })
  }

  /** 從持久層重建 OrganizationMember（不含業務邏輯）。 */
  static reconstitute(props: OrganizationMemberProps): OrganizationMember {
    return new OrganizationMember(props)
  }

  /** Returns a new member instance with the updated role. */
  changeRole(newRole: OrgMemberRole): OrganizationMember {
    return new OrganizationMember({ ...this.props, role: newRole })
  }

  /** Unique identifier. */
  get id(): string {
    return this.props.id
  }
  /** Associated organization ID. */
  get organizationId(): string {
    return this.props.organizationId
  }
  /** Associated user ID. */
  get userId(): string {
    return this.props.userId
  }
  /** Assigned role as OrgMemberRole VO. */
  get role(): OrgMemberRole {
    return this.props.role
  }
  /** Timestamp when the user joined. */
  get joinedAt(): Date {
    return this.props.joinedAt
  }
  /** Record creation timestamp. */
  get createdAt(): Date {
    return this.props.createdAt
  }

  /** Returns true if the member holds the manager role. */
  isManager(): boolean {
    return this.props.role.isManager()
  }
}
