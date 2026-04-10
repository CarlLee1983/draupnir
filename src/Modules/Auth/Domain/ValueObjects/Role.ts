/**
 * Role Value Object
 * Handles identity role categorization and validation.
 *
 * Responsibilities:
 * - Represent an authorization role.
 * - Validate that the role is one of the allowed values.
 * - Provide convenience predicates for standard roles (admin, manager, member).
 */

/**
 * Enumeration of supported role types.
 */
export enum RoleType {
  /** Highest level of privilege; access to all administrative features. */
  ADMIN = 'admin',
  /** Medium level of privilege; can manage users and organizational units. */
  MANAGER = 'manager',
  /** Standard level of privilege; basic system access. */
  MEMBER = 'member',
}

/**
 * Value object representing a user's role within the system.
 */
export class Role {
  /** The internal role type value. */
  private readonly value: RoleType

  /**
   * Creates a Role value object.
   * @throws {Error} If the role value is not supported.
   */
  constructor(value: RoleType | string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid role: ${value}`)
    }

    this.value = value as RoleType
  }

  /** Factory method to create an Admin role. */
  static admin(): Role {
    return new Role(RoleType.ADMIN)
  }

  /** Factory method to create a Manager role. */
  static manager(): Role {
    return new Role(RoleType.MANAGER)
  }

  /** Factory method to create a Member role. */
  static member(): Role {
    return new Role(RoleType.MEMBER)
  }

  /** Validates if the given string represents a valid role type. */
  private isValid(value: string): boolean {
    return Object.values(RoleType).includes(value as RoleType)
  }

  /** Gets the raw RoleType enum value. */
  getValue(): RoleType {
    return this.value
  }

  /** Checks if the role is Admin. */
  isAdmin(): boolean {
    return this.value === RoleType.ADMIN
  }

  /** Checks if the role is Manager. */
  isManager(): boolean {
    return this.value === RoleType.MANAGER
  }

  /** Checks if the role is Member. */
  isMember(): boolean {
    return this.value === RoleType.MEMBER
  }

  /** Checks for value equality against another Role instance. */
  equals(other: Role): boolean {
    return this.value === other.value
  }

  /** Returns the string representation of the role. */
  toString(): string {
    return this.value
  }
}

