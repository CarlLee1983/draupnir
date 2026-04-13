import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { DashboardAnalyticsQuery, ModelComparisonResponse } from '../DTOs/DashboardDTO'
import type { IUsageRepository } from '../Ports/IUsageRepository'
import { DashboardKeyScopeResolver } from './DashboardKeyScopeResolver'

export class GetModelComparisonService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly usageRepository: IUsageRepository,
  ) {}

  async execute(query: DashboardAnalyticsQuery): Promise<ModelComparisonResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        query.orgId,
        query.callerUserId,
        query.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: "Unauthorized to access this organization's dashboard",
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const range = resolveDateRange(query.startTime, query.endTime)
      const membershipRole = authResult.membership?.role
      const keys = await this.apiKeyRepository.findByOrgId(query.orgId)
      const visibleKeys = DashboardKeyScopeResolver.resolveVisibleKeys(keys, {
        callerUserId: query.callerUserId,
        callerSystemRole: query.callerSystemRole,
        orgMembershipRole: membershipRole,
      })

      const keyIds =
        query.apiKeyIds && query.apiKeyIds.length > 0
          ? visibleKeys.filter((key) => query.apiKeyIds?.includes(key.id)).map((key) => key.id)
          : visibleKeys.map((key) => key.id)

      if (query.apiKeyIds && query.apiKeyIds.length > 0) {
        const rows =
          keyIds.length > 0
            ? await this.usageRepository.queryModelBreakdownByKeys(keyIds, range)
            : []
        return { success: true, message: 'Query successful', data: { rows } }
      }

      if (query.callerSystemRole === 'admin' || membershipRole === 'manager') {
        const rows = await this.usageRepository.queryModelBreakdown(query.orgId, range)
        return { success: true, message: 'Query successful', data: { rows } }
      }

      const rows =
        keyIds.length > 0 ? await this.usageRepository.queryModelBreakdownByKeys(keyIds, range) : []

      return { success: true, message: 'Query successful', data: { rows } }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}

function resolveDateRange(
  startTime?: string,
  endTime?: string,
): { startDate: string; endDate: string } {
  if (startTime && endTime) {
    return { startDate: startTime, endDate: endTime }
  }

  const endDate = endTime ?? new Date().toISOString()
  const startDate = startTime ?? new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()

  return { startDate, endDate }
}
