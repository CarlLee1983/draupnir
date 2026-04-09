/**
 * User 聚合根
 *
 * 責任：
 * - 用戶身份管理
 * - 用戶狀態維護
 * - 不變性約束
 */

import { Email } from '../ValueObjects/Email'
import { Password } from '../ValueObjects/Password'
import { Role, RoleType } from '../ValueObjects/Role'

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface UserProps {
  id: string
  email: Email
  password: Password
  role: Role
  status: UserStatus
  createdAt: Date
  updatedAt: Date
}

export class User {
  private props: UserProps

  private constructor(props: UserProps) {
    this.props = props
  }

  static create(
    id: string,
    email: Email,
    password: Password,
    role: Role = Role.member(),
    status: UserStatus = UserStatus.ACTIVE,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ): User {
    return new User({
      id,
      email,
      password,
      role,
      status,
      createdAt,
      updatedAt,
    })
  }

  static reconstitute(props: UserProps): User {
    return new User(props)
  }

  setStatus(status: UserStatus): void {
    this.props.status = status
    this.props.updatedAt = new Date()
  }

  suspend(): void {
    this.setStatus(UserStatus.SUSPENDED)
  }

  activate(): void {
    this.setStatus(UserStatus.ACTIVE)
  }

  isSuspended(): boolean {
    return this.props.status === UserStatus.SUSPENDED
  }

  isAdmin(): boolean {
    return this.props.role.isAdmin()
  }

  get id(): string {
    return this.props.id
  }

  get email(): Email {
    return this.props.email
  }

  get emailValue(): string {
    return this.props.email.getValue()
  }

  get password(): Password {
    return this.props.password
  }

  get role(): Role {
    return this.props.role
  }

  get roleValue(): RoleType {
    return this.props.role.getValue()
  }

  get status(): UserStatus {
    return this.props.status
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }
}
