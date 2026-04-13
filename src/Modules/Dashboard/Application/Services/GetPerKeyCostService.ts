import type { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type {
  DashboardAnalyticsQuery,
  PerKeyCostResponse,
  PerKeyCostRow,
} from '../DTOs/DashboardDTO'
import type { IUsageRepository } from '../Ports/IUsageRepository'
import { DashboardKeyScopeResolver } from './DashboardKeyScopeResolver'

export class GetPerKeyCostService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly usageRepository: IUsageRepository,
  ) {}

  async execute(query: DashboardAnalyticsQuery): Promise<PerKeyCostResponse> {
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
      const keyMap = new Map(keys.map((key) => [key.id, key.label] as const))

      const rawRows =
        query.callerSystemRole === 'admin' || membershipRole === 'manager'
          ? await this.usageRepository.queryPerKeyCost(query.orgId, range)
          : await this.queryMemberScopedRows(query, keys, range, membershipRole)

      const grandTotal = rawRows.reduce(
        (totals, row) => ({
          totalCost: totals.totalCost + row.totalCost,
          totalRequests: totals.totalRequests + row.totalRequests,
          totalTokens: totals.totalTokens + row.totalTokens,
        }),
        { totalCost: 0, totalRequests: 0, totalTokens: 0 },
      )

      const rows: readonly PerKeyCostRow[] = rawRows.map((row) => ({
        apiKeyId: row.apiKeyId,
        keyName: keyMap.get(row.apiKeyId) ?? row.apiKeyId,
        totalCost: row.totalCost,
        totalRequests: row.totalRequests,
        totalTokens: row.totalTokens,
        costPerRequest: row.totalRequests > 0 ? row.totalCost / row.totalRequests : 0,
        tokensPerRequest: row.totalRequests > 0 ? row.totalTokens / row.totalRequests : 0,
        percentOfTotal: grandTotal.totalCost > 0 ? (row.totalCost / grandTotal.totalCost) * 100 : 0,
      }))

      return {
        success: true,
        message: 'Query successful',
        data: {
          rows,
          grandTotal,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }

  private async queryMemberScopedRows(
    query: DashboardAnalyticsQuery,
    keys: readonly ApiKey[],
    range: { startDate: string; endDate: string },
    membershipRole: string | undefined,
  ) {
    const visibleKeys = DashboardKeyScopeResolver.resolveVisibleKeys(keys, {
      callerUserId: query.callerUserId,
      callerSystemRole: query.callerSystemRole,
      orgMembershipRole: membershipRole,
    })

    const keyIds = visibleKeys.map((key) => key.id)
    if (keyIds.length === 0) {
      return []
    }

    return this.usageRepository.queryPerKeyCostByKeys(keyIds, range)
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
