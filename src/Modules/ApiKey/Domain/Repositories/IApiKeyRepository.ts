/**
 * IApiKeyRepository
 * Domain Repository: contract for API key persistence.
 */

import type { IDatabaseAccess } from '@/Shared/Domain/IDatabaseAccess'
import type { ApiKey } from '../Aggregates/ApiKey'

export interface IApiKeyRepository {
  /** Finds a key by its unique identifier. */
  findById(id: string): Promise<ApiKey | null>

  /** Retrieves all keys belonging to an organization. */
  findByOrgId(orgId: string, limit?: number, offset?: number): Promise<ApiKey[]>

  /** Retrieves only active keys for an organization. */
  findActiveByOrgId(orgId: string): Promise<ApiKey[]>

  /** Retrieves keys suspended for a specific reason. */
  findSuspendedByOrgId(orgId: string, reason: string): Promise<ApiKey[]>

  /** Finds a key by its secure hash. */
  findByKeyHash(keyHash: string): Promise<ApiKey | null>

  /** Persists a new API key. */
  save(apiKey: ApiKey): Promise<void>

  /** Updates an existing API key. */
  update(apiKey: ApiKey): Promise<void>

  /** Removes an API key record (permanently). */
  delete(id: string): Promise<void>

  /** Returns the total count of keys for an organization. */
  countByOrgId(orgId: string): Promise<number>

  /** Returns the count of active keys for an organization. */
  countActiveByOrgId(orgId: string): Promise<number>

  /** Finds a key by its Bifrost virtual key ID. Returns null if not found. */
  findByBifrostVirtualKeyId(bifrostVirtualKeyId: string): Promise<ApiKey | null>

  /**
   * 依組織與被指派成員篩選 key。
   * 用於 Member portal 列表與「依 keyId 讀取」的可視度驗證。
   *
   * @param orgId - 使用者所屬組織（必填，避免跨組織洩漏）
   * @param assignedMemberId - 被指派的 user_id
   */
  findByOrgAndAssignedMember(
    orgId: string,
    assignedMemberId: string,
    limit?: number,
    offset?: number,
  ): Promise<ApiKey[]>

  /** 依組織與被指派成員計數（配合分頁）。 */
  countByOrgAndAssignedMember(orgId: string, assignedMemberId: string): Promise<number>

  /**
   * 清除某組織下所有指派給特定成員的 key 之 assigned_member_id（設為 NULL）。
   * 用於「移除組織成員」時保留 key 本身但解除指派（spec §7.3）。
   */
  clearAssignmentsForMember(orgId: string, memberUserId: string): Promise<void>

  /** Returns a repository instance scoped to a transaction. */
  withTransaction(tx: IDatabaseAccess): IApiKeyRepository
}
