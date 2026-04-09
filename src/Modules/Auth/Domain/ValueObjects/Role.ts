/**
 * Role 值物件
 *
 * 責任：
 * - 表示系統中的身份角色
 * - 驗證角色有效性
 * - 提供角色語意判斷
 */

export enum RoleType {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
}

export class Role {
  private readonly value: RoleType

  constructor(value: RoleType | string) {
    if (!this.isValid(value)) {
      throw new Error(`無效的角色: ${value}`)
    }

    this.value = value as RoleType
  }

  static admin(): Role {
    return new Role(RoleType.ADMIN)
  }

  static manager(): Role {
    return new Role(RoleType.MANAGER)
  }

  static member(): Role {
    return new Role(RoleType.MEMBER)
  }

  private isValid(value: string): boolean {
    return Object.values(RoleType).includes(value as RoleType)
  }

  getValue(): RoleType {
    return this.value
  }

  isAdmin(): boolean {
    return this.value === RoleType.ADMIN
  }

  isManager(): boolean {
    return this.value === RoleType.MANAGER
  }

  isMember(): boolean {
    return this.value === RoleType.MEMBER
  }

  equals(other: Role): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
