import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IUsageAggregator } from '../Ports/IUsageAggregator'
import type { UsageChartQuery, UsageChartResponse } from '../DTOs/DashboardDTO'

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
          message: '無權存取此組織的用量資料',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const keys = await this.apiKeyRepository.findByOrgId(query.orgId)
      const virtualKeyIds = keys
        .filter((k) => k.status === 'active')
        .map((k) => k.gatewayKeyId)
        .filter((id) => id.length > 0)

      if (virtualKeyIds.length === 0) {
        return {
          success: true,
          message: '查詢成功',
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
        message: '查詢成功',
        data: {
          logs: logs.map((l) => ({ ...l }) as Record<string, unknown>),
          stats,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
