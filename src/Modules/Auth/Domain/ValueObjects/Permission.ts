/**
 * Permission 值物件
 *
 * 責任：
 * - 表示系統中的單個權限
 * - 驗證權限的有效性
 * - 提供權限比較
 */

export enum PermissionType {
  // 使用者管理
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_LIST = 'user:list',
  USER_MANAGE = 'user:manage',

  // 訂單管理
  ORDER_CREATE = 'order:create',
  ORDER_READ = 'order:read',
  ORDER_UPDATE = 'order:update',
  ORDER_CANCEL = 'order:cancel',
  ORDER_LIST = 'order:list',

  // 支付管理
  PAYMENT_CREATE = 'payment:create',
  PAYMENT_READ = 'payment:read',
  PAYMENT_PROCESS = 'payment:process',
  PAYMENT_REFUND = 'payment:refund',
  PAYMENT_LIST = 'payment:list',

  // 產品管理
  PRODUCT_CREATE = 'product:create',
  PRODUCT_READ = 'product:read',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_DELETE = 'product:delete',
  PRODUCT_LIST = 'product:list',

  // 系統管理
  SYSTEM_MANAGE = 'system:manage',
  ADMIN_ACCESS = 'admin:access',
}

export class Permission {
  private readonly value: PermissionType

  constructor(value: PermissionType | string) {
    if (!this.isValid(value)) {
      throw new Error(`無效的權限: ${value}`)
    }
    this.value = value as PermissionType
  }

  /**
   * 驗證權限是否有效
   */
  private isValid(value: string): boolean {
    return Object.values(PermissionType).includes(value as PermissionType)
  }

  /**
   * 取得權限值
   */
  getValue(): PermissionType {
    return this.value
  }

  /**
   * 取得權限模組（如 'user', 'order'）
   */
  getModule(): string {
    return this.value.split(':')[0]
  }

  /**
   * 取得權限動作（如 'create', 'read'）
   */
  getAction(): string {
    return this.value.split(':')[1]
  }

  /**
   * 比較兩個權限是否相同
   */
  equals(other: Permission): boolean {
    return this.value === other.value
  }

  /**
   * 檢查是否為讀取權限
   */
  isReadPermission(): boolean {
    return this.getAction() === 'read' || this.getAction() === 'list'
  }

  /**
   * 檢查是否為寫入權限
   */
  isWritePermission(): boolean {
    return ['create', 'update', 'delete'].includes(this.getAction())
  }

  /**
   * 檢查是否為管理權限
   */
  isAdminPermission(): boolean {
    return this.value === PermissionType.ADMIN_ACCESS || this.value === PermissionType.SYSTEM_MANAGE
  }

  /**
   * 轉換為字符串
   */
  toString(): string {
    return this.value
  }
}
