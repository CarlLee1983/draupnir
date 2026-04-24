/**
 * OrganizationMember
 * Domain Entity: represents the relationship between a User and an Organization.
 */

import type { OrgMemberRole } from '../ValueObjects/OrgMemberRole'

/**
 * Internal properties for the OrganizationMember entity.
 */
interface OrganizationMemberProps {
  /** Unique identifier for the membership record. */
  id: string
  /** ID of the organization the user belongs to. */
  organizationId: string
  /** ID of the user who is a member. */
  userId: string
  /** Role assigned to the user within this organization. */
  role: OrgMemberRole
  /** Timestamp when the user first joined the organization. */
  joinedAt: Date
  /** Timestamp when the record was created. */
  createdAt: Date
}

/**
 * OrganizationMember Entity
 * Represents the many-to-many relationship between Users and Organizations.
 *
 * Responsibilities:
 * - Maintain the link between a user and their organization.
 * - Track the user's role and permissions within the organizational context.
 * - Manage the lifecycle of the membership (joining, role changes).
 */
export class OrganizationMember {
  /** Internal state of the organization member. */
  private readonly props: OrganizationMemberProps

  /**
   * Internal constructor for the OrganizationMember entity.
   * Use static factory methods like `create` or `reconstitute` instead.
   *
   * @param props The initial properties for the entity.
   */
  private constructor(props: OrganizationMemberProps) {
    this.props = props
  }

  /**
   * Creates a brand new membership record.
   *
   * @param id Unique identifier for the membership.
   * @param organizationId Organization ID.
   * @param userId User ID.
   * @param role The initial role to assign.
   * @returns A new OrganizationMember instance.
   */
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

  /**
   * Reconstitutes an OrganizationMember entity from existing data (e.g., from database).
   * Does not contain business logic.
   *
   * @param props The raw properties to load.
   * @returns A reconstituted OrganizationMember instance.
   */
  static reconstitute(props: OrganizationMemberProps): OrganizationMember {
    return new OrganizationMember(props)
  }

  /**
   * Returns a new membership instance with an updated role (immutable pattern).
   *
   * @param newRole The new role to assign to the member.
   * @returns A new OrganizationMember instance with the updated role.
   */
  changeRole(newRole: OrgMemberRole): OrganizationMember {
    return new OrganizationMember({ ...this.props, role: newRole })
  }

  /** Gets the unique identifier of the membership. */
  get id(): string {
    return this.props.id
  }

  /** Gets the ID of the organization. */
  get organizationId(): string {
    return this.props.organizationId
  }

  /** Gets the ID of the user. */
  get userId(): string {
    return this.props.userId
  }

  /** Gets the assigned role as an OrgMemberRole value object. */
  get role(): OrgMemberRole {
    return this.props.role
  }

  /** Gets the timestamp when the user joined. */
  get joinedAt(): Date {
    return this.props.joinedAt
  }

  /** Gets the timestamp when the record was created. */
  get createdAt(): Date {
    return this.props.createdAt
  }

  /**
   * Checks if the member holds the 'manager' role.
   * 
   * @returns True if the member is a manager.
   */
  isManager(): boolean {
    return this.props.role.isManager()
  }
}
