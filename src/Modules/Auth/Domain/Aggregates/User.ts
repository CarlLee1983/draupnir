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

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface UserProps {
  id: string
  email: Email
  password: Password
  role: UserRole
  status: UserStatus
  createdAt: Date
  updatedAt: Date
}

export class User {
  private props: UserProps

  private constructor(props: UserProps) {
    this.props = props
  }

  /**
   * 建立新用戶
   */
  static async create(
    id: string,
    email: Email,
    plainPassword: string,
    role: UserRole = UserRole.USER
  ): Promise<User> {
    const password = await Password.create(plainPassword)

    return new User({
      id,
      email,
      password,
      role,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * 從資料庫行重構
   */
  static fromDatabase(row: any): User {
    return new User({
      id: row.id,
      email: new Email(row.email),
      password: Password.fromHashed(row.password),
      role: row.role as UserRole,
      status: row.status as UserStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    })
  }

  /**
   * 驗證密碼
   */
  async verifyPassword(plainPassword: string): Promise<boolean> {
    return this.props.password.matches(plainPassword)
  }

  /**
   * 更改密碼
   */
  async changePassword(newPlainPassword: string): Promise<void> {
    const newPassword = await Password.create(newPlainPassword)
    this.props.password = newPassword
    this.props.updatedAt = new Date()
  }

  /**
   * 更新狀態
   */
  setStatus(status: UserStatus): void {
    this.props.status = status
    this.props.updatedAt = new Date()
  }

  /**
   * 暫停用戶帳戶
   */
  suspend(): void {
    this.setStatus(UserStatus.SUSPENDED)
  }

  /**
   * 啟用用戶帳戶
   */
  activate(): void {
    this.setStatus(UserStatus.ACTIVE)
  }

  /**
   * 檢查用戶是否被暫停
   */
  isSuspended(): boolean {
    return this.props.status === UserStatus.SUSPENDED
  }

  /**
   * 檢查用戶是否為管理員
   */
  isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get email(): Email {
    return this.props.email
  }

  get emailValue(): string {
    return this.props.email.getValue()
  }

  get role(): UserRole {
    return this.props.role
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

  /**
   * 轉換為資料庫行格式
   */
  toDatabaseRow(): any {
    return {
      id: this.props.id,
      email: this.props.email.getValue(),
      password: this.props.password.getHashed(),
      role: this.props.role,
      status: this.props.status,
      created_at: this.props.createdAt,
      updated_at: this.props.updatedAt,
    }
  }

  /**
   * 轉換為 DTO（不包含密碼）
   */
  toDTO(): any {
    return {
      id: this.props.id,
      email: this.props.email.getValue(),
      role: this.props.role,
      status: this.props.status,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    }
  }
}
