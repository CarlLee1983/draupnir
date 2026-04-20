import { AsyncLocalStorage } from 'node:async_hooks'
import type { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'

/**
 * Per-HTTP-request memoization for `(userId, organizationId) → membership` lookups.
 *
 * `requireOrganizationContext` and application services both call
 * `IOrganizationMemberRepository.findByUserAndOrgId` for the same pair; without a request
 * scope this repeats identical SELECTs and triggers Atlas N+1 warnings.
 *
 * Non-HTTP callers (jobs, scripts, tests) have no store — the repository falls through to DB.
 */

type MembershipMap = Map<string, OrganizationMember | null>

const storage = new AsyncLocalStorage<MembershipMap>()

function cacheKey(userId: string, orgId: string): string {
  return `${userId}\u0000${orgId}`
}

/** @returns `undefined` when uncached; otherwise the resolved member (possibly `null`). */
export function getCachedMembershipLookup(
  userId: string,
  orgId: string,
): OrganizationMember | null | undefined {
  const map = storage.getStore()
  if (!map) return undefined
  const k = cacheKey(userId, orgId)
  if (!map.has(k)) return undefined
  return map.get(k) as OrganizationMember | null
}

export function setCachedMembershipLookup(
  userId: string,
  orgId: string,
  member: OrganizationMember | null,
): void {
  const map = storage.getStore()
  if (!map) return
  map.set(cacheKey(userId, orgId), member)
}

export function createOrganizationMemberLookupCacheStore(): MembershipMap {
  return new Map()
}

export const organizationMemberLookupStorage = storage
