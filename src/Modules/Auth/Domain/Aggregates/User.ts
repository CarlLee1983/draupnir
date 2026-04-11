/**
 * User aggregate root.
 *
 * Responsibilities:
 * - Identity and credentials (via value objects)
 * - Account status lifecycle
 * - Enforce invariants for user state
 */

import type { Email } from '../ValueObjects/Email'
import { Password } from '../ValueObjects/Password'
import { Role, type RoleType } from '../ValueObjects/Role'

/**
 * Enumeration of possible user account statuses.
 */
export enum UserStatus {
  /** User is fully active and can access the system. */
  ACTIVE = 'active',
  /** User account has been created but is not yet active. */
  INACTIVE = 'inactive',
  /** User account has been suspended by an administrator. */
  SUSPENDED = 'suspended',
}

/**
 * Properties required to construct or reconstitute a User aggregate.
 */
export interface UserProps {
  /** Unique identifier of the user. */
  id: string
  /** User's validated email address. */
  email: Email
  /** User's secure hashed password. */
  password: Password
  /** User's assigned role and permissions. */
  role: Role
  /** Current account status. */
  status: UserStatus
  /** Google account subject (`sub`) when linked via OAuth; otherwise null. */
  googleId: string | null
  /** When the user account was first created. */
  createdAt: Date
  /** When the user account was last updated. */
  updatedAt: Date
}

/**
 * Aggregate root representing a User in the authentication domain.
 */
export class User {
  /** Internal state of the user. */
  private props: UserProps

  /**
   * Internal constructor for the User aggregate.
   * Use static factory methods like `create` or `reconstitute` instead.
   */
  private constructor(props: UserProps) {
    this.props = props
  }

  /**
   * Creates a brand new user instance with default values.
   */
  static create(
    id: string,
    email: Email,
    password: Password,
    role: Role = Role.member(),
    status: UserStatus = UserStatus.ACTIVE,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
    googleId: string | null = null,
  ): User {
    return new User({
      id,
      email,
      password,
      role,
      status,
      googleId,
      createdAt,
      updatedAt,
    })
  }

  /**
   * Reconstitutes a User aggregate from existing data (e.g., from a database).
   */
  static reconstitute(props: UserProps): User {
    return new User(props)
  }

  /**
   * Updates the user's account status.
   */
  setStatus(status: UserStatus): void {
    this.props.status = status
    this.props.updatedAt = new Date()
  }

  /**
   * Suspends the user's account, preventing login.
   */
  suspend(): void {
    this.setStatus(UserStatus.SUSPENDED)
  }

  /**
   * Activates the user's account, allowing login.
   */
  activate(): void {
    this.setStatus(UserStatus.ACTIVE)
  }

  /**
   * Associates a Google account with this user (e.g. first OAuth login for an email-only account).
   */
  linkGoogleAccount(googleId: string): void {
    this.props.googleId = googleId
    this.props.updatedAt = new Date()
  }

  /**
   * Checks if the user's account is currently suspended.
   */
  isSuspended(): boolean {
    return this.props.status === UserStatus.SUSPENDED
  }

  /**
   * Checks if the user has administrative privileges.
   */
  isAdmin(): boolean {
    return this.props.role.isAdmin()
  }

  /** Gets the unique identifier of the user. */
  get id(): string {
    return this.props.id
  }

  /** Gets the user's Email value object. */
  get email(): Email {
    return this.props.email
  }

  /** Gets the string value of the user's email address. */
  get emailValue(): string {
    return this.props.email.getValue()
  }

  /** Gets the user's Password value object. */
  get password(): Password {
    return this.props.password
  }

  /** Gets the user's Role value object. */
  get role(): Role {
    return this.props.role
  }

  /** Gets the raw string value of the user's role. */
  get roleValue(): RoleType {
    return this.props.role.getValue()
  }

  /** Gets the user's current account status. */
  get status(): UserStatus {
    return this.props.status
  }

  /** Google OAuth subject id when linked; otherwise null. */
  get googleId(): string | null {
    return this.props.googleId
  }

  /** Gets the timestamp when the user account was created. */
  get createdAt(): Date {
    return this.props.createdAt
  }

  /** Gets the timestamp when the user account was last updated. */
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  /**
   * Returns a new User with an updated hashed password (immutable pattern).
   */
  withPassword(hashedPassword: string): User {
    return new User({
      ...this.props,
      password: Password.fromHashed(hashedPassword),
      updatedAt: new Date(),
    })
  }
}
