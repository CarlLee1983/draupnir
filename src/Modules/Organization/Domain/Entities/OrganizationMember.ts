/**
 * OrganizationMember
 * Domain Entity: represents the relationship between a User and an Organization.
 */

/** Properties defining an OrganizationMember's state. */
interface OrganizationMemberProps {
  id: string
  organizationId: string
  userId: string
  role: string
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
    role: string,
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

  /** Reconstitutes a member from database row. */
  static fromDatabase(row: Record<string, unknown>): OrganizationMember {
    return new OrganizationMember({
      id: row.id as string,
      organizationId: row.organization_id as string,
      userId: row.user_id as string,
      role: row.role as string,
      joinedAt: new Date(row.joined_at as string),
      createdAt: new Date(row.created_at as string),
    })
  }

  /** Returns a new member instance with the updated role. */
  changeRole(newRole: string): OrganizationMember {
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
  /** Assigned role (e.g., "manager", "member"). */
  get role(): string {
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
    return this.props.role === 'manager'
  }

}

