import {
  add,
  avg,
  coalesce,
  col,
  count,
  dateTrunc,
  sum,
} from '@/Shared/Infrastructure/Database/AggregateSpec'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type {
  DailyCostBucket,
  DateRange,
  IUsageRepository,
  ModelUsageBucket,
  PerKeyCostBucket,
  UsageRecordInsert,
  UsageStats,
} from '../../Application/Ports/IUsageRepository'

export class DrizzleUsageRepository implements IUsageRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async upsert(record: UsageRecordInsert): Promise<void> {
    await this.db.table('usageRecords').insertOrIgnore(
      {
        id: record.id,
        bifrost_log_id: record.bifrostLogId,
        api_key_id: record.apiKeyId,
        org_id: record.orgId,
        model: record.model,
        provider: record.provider,
        input_tokens: record.inputTokens,
        output_tokens: record.outputTokens,
        credit_cost: record.creditCost,
        latency_ms: record.latencyMs,
        status: record.status,
        occurred_at: record.occurredAt,
        created_at: record.createdAt,
      },
      { conflictTarget: 'bifrost_log_id' },
    )
  }

  async queryDailyCostByOrg(orgId: string, range: DateRange): Promise<readonly DailyCostBucket[]> {
    return this.db
      .table('usageRecords')
      .where('org_id', '=', orgId)
      .whereBetween('occurred_at', [range.startDate, range.endDate])
      .aggregate<DailyCostBucket>(this.dailyCostSpec())
  }

  async queryDailyCostByKeys(
    apiKeyIds: readonly string[],
    range: DateRange,
  ): Promise<readonly DailyCostBucket[]> {
    if (apiKeyIds.length === 0) return []
    return this.db
      .table('usageRecords')
      .where('api_key_id', 'in', [...apiKeyIds])
      .whereBetween('occurred_at', [range.startDate, range.endDate])
      .aggregate<DailyCostBucket>(this.dailyCostSpec())
  }

  async queryModelBreakdown(orgId: string, range: DateRange): Promise<readonly ModelUsageBucket[]> {
    return this.db
      .table('usageRecords')
      .where('org_id', '=', orgId)
      .whereBetween('occurred_at', [range.startDate, range.endDate])
      .aggregate<ModelUsageBucket>(this.modelBreakdownSpec())
  }

  async queryModelBreakdownByKeys(
    apiKeyIds: readonly string[],
    range: DateRange,
  ): Promise<readonly ModelUsageBucket[]> {
    if (apiKeyIds.length === 0) return []
    return this.db
      .table('usageRecords')
      .where('api_key_id', 'in', [...apiKeyIds])
      .whereBetween('occurred_at', [range.startDate, range.endDate])
      .aggregate<ModelUsageBucket>(this.modelBreakdownSpec())
  }

  async queryStatsByOrg(orgId: string, range: DateRange): Promise<UsageStats> {
    return this.runStats('org_id', orgId, range)
  }

  async queryStatsByKey(apiKeyId: string, range: DateRange): Promise<UsageStats> {
    return this.runStats('api_key_id', apiKeyId, range)
  }

  async queryPerKeyCost(orgId: string, range: DateRange): Promise<readonly PerKeyCostBucket[]> {
    return this.db
      .table('usageRecords')
      .where('org_id', '=', orgId)
      .whereBetween('occurred_at', [range.startDate, range.endDate])
      .aggregate<PerKeyCostBucket>(this.perKeyCostSpec())
  }

  async queryPerKeyCostByKeys(
    apiKeyIds: readonly string[],
    range: DateRange,
  ): Promise<readonly PerKeyCostBucket[]> {
    if (apiKeyIds.length === 0) return []
    return this.db
      .table('usageRecords')
      .where('api_key_id', 'in', [...apiKeyIds])
      .whereBetween('occurred_at', [range.startDate, range.endDate])
      .aggregate<PerKeyCostBucket>(this.perKeyCostSpec())
  }

  // --- private spec builders ---

  private dailyCostSpec() {
    return {
      select: {
        date: dateTrunc('day', 'occurred_at'),
        totalCost: sum('credit_cost'),
        totalRequests: count('*'),
        totalInputTokens: sum('input_tokens'),
        totalOutputTokens: sum('output_tokens'),
      },
      groupBy: ['date'],
      orderBy: [{ column: 'date', direction: 'ASC' as const }],
    }
  }

  private modelBreakdownSpec() {
    return {
      select: {
        model: col('model'),
        provider: col('provider'),
        totalCost: sum('credit_cost'),
        totalRequests: count('*'),
        avgLatencyMs: avg(coalesce('latency_ms', 0)),
      },
      groupBy: ['model', 'provider'],
      orderBy: [{ column: 'totalCost', direction: 'DESC' as const }],
      limit: 10,
    }
  }

  private perKeyCostSpec() {
    return {
      select: {
        apiKeyId: col('api_key_id'),
        totalCost: sum('credit_cost'),
        totalRequests: count('*'),
        totalTokens: sum(add('input_tokens', 'output_tokens')),
      },
      groupBy: ['api_key_id'],
      orderBy: [{ column: 'totalCost', direction: 'DESC' as const }],
    }
  }

  private async runStats(
    column: 'org_id' | 'api_key_id',
    value: string,
    range: DateRange,
  ): Promise<UsageStats> {
    const rows = await this.db
      .table('usageRecords')
      .where(column, '=', value)
      .whereBetween('occurred_at', [range.startDate, range.endDate])
      .aggregate<UsageStats>({
        select: {
          totalRequests: count('*'),
          totalCost: sum('credit_cost'),
          totalTokens: sum(add('input_tokens', 'output_tokens')),
          avgLatency: avg(coalesce('latency_ms', 0)),
        },
      })
    const row = rows[0]
    return {
      totalRequests: Number(row?.totalRequests ?? 0),
      totalCost: Number(row?.totalCost ?? 0),
      totalTokens: Number(row?.totalTokens ?? 0),
      avgLatency: Number(row?.avgLatency ?? 0),
    }
  }
}
