import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedUsageRecordInput {
  readonly id: string
  readonly bifrostLogId: string
  readonly orgId: string
  readonly apiKeyId: string
  readonly model: string
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly creditCost: number
  readonly occurredAt: string
}

export interface SeedUsageRecordResult {
  readonly id: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedUsageRecord(
  db: IDatabaseAccess,
  input: SeedUsageRecordInput,
): Promise<SeedUsageRecordResult> {
  await db.table('usage_records').insert({
    id: input.id,
    bifrost_log_id: input.bifrostLogId,
    api_key_id: input.apiKeyId,
    org_id: input.orgId,
    model: input.model,
    input_tokens: input.inputTokens ?? 0,
    output_tokens: input.outputTokens ?? 0,
    credit_cost: input.creditCost,
    occurred_at: input.occurredAt,
    created_at: NOW,
  })
  return { id: input.id }
}
