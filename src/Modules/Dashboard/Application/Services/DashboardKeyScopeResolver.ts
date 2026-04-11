import type { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'

/**
 * Resolves which org API keys a dashboard caller may see for aggregates (summary + usage chart).
 *
 * - Global system `admin`: all org keys (no org membership row required).
 * - Org `manager`: all org keys.
 * - Org `member` (and any other org role): only keys created by the caller.
 */
export class DashboardKeyScopeResolver {
  static resolveVisibleKeys(
    orgKeys: readonly ApiKey[],
    params: {
      callerUserId: string
      callerSystemRole: string
      orgMembershipRole: string | undefined
    },
  ): ApiKey[] {
    const { callerUserId, callerSystemRole, orgMembershipRole } = params

    if (callerSystemRole === 'admin') {
      return [...orgKeys]
    }

    if (orgMembershipRole === 'manager') {
      return [...orgKeys]
    }

    return orgKeys.filter((k) => k.createdByUserId === callerUserId)
  }
}
