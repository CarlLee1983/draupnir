import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IUsageRepository, UsageStats } from '../Ports/IUsageRepository'
import type { ISyncCursorRepository } from '../Ports/ISyncCursorRepository'
import type { DashboardAnalyticsQuery, KpiSummaryResponse } from '../DTOs/DashboardDTO'
import { DashboardKeyScopeResolver } from './DashboardKeyScopeResolver'

type StatsAccumulator = {
  totalRequests: number
  totalCost: number
  totalTokens: number
  weightedLatency: number
}

export class GetKpiSummaryService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly usageRepository: IUsageRepository,
    private readonly cursorRepo: ISyncCursorRepository,
  ) {}

  async execute(query: DashboardAnalyticsQuery): Promise<KpiSummaryResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        query.orgId,
        query.callerUserId,
        query.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'Unauthorized to access this organization\'s dashboard',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const range = resolveDateRange(query.startTime, query.endTime)
      const membershipRole = authResult.membership?.role
      const cursor = await this.cursorRepo.get('bifrost_logs')
      const lastSyncedAt = cursor?.lastSyncedAt ?? null

      if (query.callerSystemRole === 'admin' || membershipRole === 'manager') {
        const usage = await this.usageRepository.queryStatsByOrg(query.orgId, range)
        return { success: true, message: 'Query successful', data: { usage, lastSyncedAt } }
      }

      const keys = await this.apiKeyRepository.findByOrgId(query.orgId)
      const visibleKeys = DashboardKeyScopeResolver.resolveVisibleKeys(keys, {
        callerUserId: query.callerUserId,
        callerSystemRole: query.callerSystemRole,
        orgMembershipRole: membershipRole,
      })

      if (visibleKeys.length === 0) {
        return {
          success: true,
          message: 'Query successful',
          data: {
            usage: zeroUsage(),
            lastSyncedAt,
          },
        }
      }

      const perKeyStats = await Promise.all(
        visibleKeys.map((key) => this.usageRepository.queryStatsByKey(key.id, range)),
      )

      return {
        success: true,
        message: 'Query successful',
        data: {
          usage: combineStats(perKeyStats),
          lastSyncedAt,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}

function resolveDateRange(startTime?: string, endTime?: string): { startDate: string; endDate: string } {
  if (startTime && endTime) {
    return { startDate: startTime, endDate: endTime }
  }

  const endDate = endTime ?? new Date().toISOString()
  const startDate =
    startTime ??
    new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()

  return { startDate, endDate }
}

function zeroUsage(): UsageStats {
  return { totalRequests: 0, totalCost: 0, totalTokens: 0, avgLatency: 0 }
}

function combineStats(stats: readonly UsageStats[]): UsageStats {
  const aggregate = stats.reduce<StatsAccumulator>(
    (acc, stat) => {
      acc.totalRequests += stat.totalRequests
      acc.totalCost += stat.totalCost
      acc.totalTokens += stat.totalTokens
      acc.weightedLatency += stat.avgLatency * stat.totalRequests
      return acc
    },
    { totalRequests: 0, totalCost: 0, totalTokens: 0, weightedLatency: 0 },
  )

  if (aggregate.totalRequests === 0) {
    return zeroUsage()
  }

  return {
    totalRequests: aggregate.totalRequests,
    totalCost: aggregate.totalCost,
    totalTokens: aggregate.totalTokens,
    avgLatency: Number((aggregate.weightedLatency / aggregate.totalRequests).toFixed(2)),
  }
}
