import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import {
  createOrganizationMemberLookupCacheStore,
  organizationMemberLookupStorage,
} from '@/wiring/OrganizationMemberLookupCache'

/**
 * Establishes AsyncLocalStorage for {@link OrganizationMemberRepository.findByUserAndOrgId}
 * memoization for the lifetime of one HTTP request.
 */
export function createOrganizationMemberLookupCacheMiddleware(): Middleware {
  return async (_ctx, next) => {
    const store = createOrganizationMemberLookupCacheStore()
    return await organizationMemberLookupStorage.run(store, async () => await next())
  }
}
