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

      // Resolve visible keys once — admin/manager callers will not use this list
      // (queryUsageForCaller takes the queryStatsByOrg branch for them)
      let visibleKeys: readonly { id: string }[] = []
      if (query.callerSystemRole !== 'admin' && membershipRole !== 'manager') {
        const keys = await this.apiKeyRepository.findByOrgId(query.orgId)
        visibleKeys = DashboardKeyScopeResolver.resolveVisibleKeys(keys, {
          callerUserId: query.callerUserId,
          callerSystemRole: query.callerSystemRole,
          orgMembershipRole: membershipRole,
        })
      }

      const usage = await this.queryUsageForCaller(
        query.orgId,
        range,
        query.callerSystemRole,
        membershipRole,
        visibleKeys,
      )

      const windowMs =
        new Date(range.endDate).getTime() - new Date(range.startDate).getTime()
      const priorRange = {
        startDate: new Date(new Date(range.startDate).getTime() - windowMs).toISOString(),
        endDate: range.startDate,
      }

      const previousPeriod = await this.queryUsageForCaller(
        query.orgId,
        priorRange,
        query.callerSystemRole,
        membershipRole,
        visibleKeys,
      )

      return {
        success: true,
        message: 'Query successful',
        data: { usage, previousPeriod, lastSyncedAt },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }

  private async queryUsageForCaller(
    orgId: string,
    range: { startDate: string; endDate: string },
    callerSystemRole: string,
    membershipRole: string | undefined,
    visibleKeys: readonly { id: string }[],
  ): Promise<UsageStats> {
    if (callerSystemRole === 'admin' || membershipRole === 'manager') {
      return this.usageRepository.queryStatsByOrg(orgId, range)
    }

    if (visibleKeys.length === 0) return zeroUsage()

    const perKeyStats = await Promise.all(
      visibleKeys.map((key) => this.usageRepository.queryStatsByKey(key.id, range)),
    )

    return combineStats(perKeyStats)
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
