/**
 * Role 值物件
 *
 * 責任：
 * - 表示用戶角色
 * - 管理角色對應的權限集合
 * - 檢查角色是否擁有特定權限
 */

import { Permission, PermissionType } from './Permission'

export enum RoleType {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export class Role {
  private readonly value: RoleType
  private readonly permissions: Set<PermissionType>

  constructor(value: RoleType | string) {
    if (!this.isValid(value)) {
      throw new Error(`無效的角色: ${value}`)
    }
    this.value = value as RoleType
    this.permissions = this.initializePermissions(this.value)
  }

  /**
   * 驗證角色是否有效
   */
  private isValid(value: string): boolean {
    return Object.values(RoleType).includes(value as RoleType)
  }

  /**
   * 根據角色初始化權限集合
   */
  private initializePermissions(role: RoleType): Set<PermissionType> {
    const permissions: PermissionType[] = []

    switch (role) {
      case RoleType.ADMIN:
        // 管理員擁有所有權限
        permissions.push(
          PermissionType.ADMIN_ACCESS,
          PermissionType.SYSTEM_MANAGE,
          // 使用者管理
          PermissionType.USER_CREATE,
          PermissionType.USER_READ,
          PermissionType.USER_UPDATE,
          PermissionType.USER_DELETE,
          PermissionType.USER_LIST,
          PermissionType.USER_MANAGE,
          // 訂單管理
          PermissionType.ORDER_CREATE,
          PermissionType.ORDER_READ,
          PermissionType.ORDER_UPDATE,
          PermissionType.ORDER_CANCEL,
          PermissionType.ORDER_LIST,
          // 支付管理
          PermissionType.PAYMENT_CREATE,
          PermissionType.PAYMENT_READ,
          PermissionType.PAYMENT_PROCESS,
          PermissionType.PAYMENT_REFUND,
          PermissionType.PAYMENT_LIST,
          // 產品管理
          PermissionType.PRODUCT_CREATE,
          PermissionType.PRODUCT_READ,
          PermissionType.PRODUCT_UPDATE,
          PermissionType.PRODUCT_DELETE,
          PermissionType.PRODUCT_LIST
        )
        break

      case RoleType.USER:
        // 普通使用者權限
        permissions.push(
          PermissionType.USER_READ, // 只能讀自己的信息
          PermissionType.ORDER_CREATE,
          PermissionType.ORDER_READ, // 只能讀自己的訂單
          PermissionType.PAYMENT_CREATE,
          PermissionType.PAYMENT_READ, // 只能讀自己的支付
          PermissionType.PRODUCT_READ,
          PermissionType.PRODUCT_LIST
        )
        break

      case RoleType.GUEST:
        // 訪客權限（最小）
        permissions.push(
          PermissionType.PRODUCT_READ,
          PermissionType.PRODUCT_LIST
        )
        break
    }

    return new Set(permissions)
  }

  /**
   * 取得角色值
   */
  getValue(): RoleType {
    return this.value
  }

  /**
   * 取得角色擁有的所有權限
   */
  getPermissions(): Permission[] {
    return Array.from(this.permissions).map((perm) => new Permission(perm))
  }

  /**
   * 檢查角色是否擁有特定權限
   */
  hasPermission(permission: Permission): boolean {
    return this.permissions.has(permission.getValue())
  }

  /**
   * 檢查角色是否擁有特定權限字符串
   */
  hasPermissionString(permission: PermissionType): boolean {
    return this.permissions.has(permission)
  }

  /**
   * 檢查角色是否為管理員
   */
  isAdmin(): boolean {
    return this.value === RoleType.ADMIN
  }

  /**
   * 檢查角色是否為普通使用者
   */
  isUser(): boolean {
    return this.value === RoleType.USER
  }

  /**
   * 檢查角色是否為訪客
   */
  isGuest(): boolean {
    return this.value === RoleType.GUEST
  }

  /**
   * 比較兩個角色是否相同
   */
  equals(other: Role): boolean {
    return this.value === other.value
  }

  /**
   * 轉換為字符串
   */
  toString(): string {
    return this.value
  }
}
