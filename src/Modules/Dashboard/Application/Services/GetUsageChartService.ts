import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { UsageChartQuery, UsageChartResponse } from '../DTOs/DashboardDTO'
import type { IUsageAggregator } from '../Ports/IUsageAggregator'
import { DashboardKeyScopeResolver } from './DashboardKeyScopeResolver'

export class GetUsageChartService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly usageAggregator: IUsageAggregator,
  ) {}

  async execute(query: UsageChartQuery): Promise<UsageChartResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        query.orgId,
        query.callerUserId,
        query.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: "Unauthorized to access this organization's usage data",
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const keys = await this.apiKeyRepository.findByOrgId(query.orgId)
      const visibleKeys = DashboardKeyScopeResolver.resolveVisibleKeys(keys, {
        callerUserId: query.callerUserId,
        callerSystemRole: query.callerSystemRole,
        orgMembershipRole: authResult.membership?.role,
      })

      const virtualKeyIds = visibleKeys
        .filter((k) => k.status === 'active')
        .map((k) => k.gatewayKeyId)
        .filter((id) => id.length > 0)

      if (virtualKeyIds.length === 0) {
        return {
          success: true,
          message: 'Query successful',
          data: {
            logs: [],
            stats: { totalRequests: 0, totalCost: 0, totalTokens: 0, avgLatency: 0 },
          },
        }
      }

      const usageQuery: Record<string, unknown> = {
        startTime: query.startTime,
        endTime: query.endTime,
        providers: query.providers,
        models: query.models,
        limit: query.limit,
      }

      const [logs, stats] = await Promise.all([
        this.usageAggregator.getLogs(virtualKeyIds, usageQuery),
        this.usageAggregator.getStats(virtualKeyIds, usageQuery),
      ])

      return {
        success: true,
        message: 'Query successful',
        data: {
          logs: logs.map((l) => ({ ...l }) as Record<string, unknown>),
          stats,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}
