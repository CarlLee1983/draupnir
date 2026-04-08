/**
 * AuthorizationService
 * Domain Service - 權限檢查
 *
 * 責任：
 * - 檢查用戶是否有特定權限
 * - 支持角色和權限的檢查
 */

import type { Permission } from '../ValueObjects/Permission'
import type { Role } from '../ValueObjects/Role'

export class AuthorizationService {
  /**
   * 檢查用戶角色是否擁有特定權限
   */
  hasPermission(role: Role, permission: Permission): boolean {
    return role.hasPermission(permission)
  }

  /**
   * 檢查用戶是否為管理員
   */
  isAdmin(role: Role): boolean {
    return role.isAdmin()
  }

  /**
   * 檢查用戶是否有任何一個指定的權限
   */
  hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some((perm) => role.hasPermission(perm))
  }

  /**
   * 檢查用戶是否擁有所有指定的權限
   */
  hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every((perm) => role.hasPermission(perm))
  }

  /**
   * 檢查用戶角色等級（用於跨角色檢查）
   * 返回：admin > user > guest
   */
  getRoleLevel(role: Role): number {
    if (role.isAdmin()) return 3
    if (role.isUser()) return 2
    return 1
  }

  /**
   * 檢查用戶A是否可以管理用戶B
   */
  canManageUser(userRole: Role, targetUserRole: Role): boolean {
    return this.getRoleLevel(userRole) > this.getRoleLevel(targetUserRole)
  }
}
