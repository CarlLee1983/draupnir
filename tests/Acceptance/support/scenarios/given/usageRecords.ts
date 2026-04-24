import type { ScenarioRunner } from '../runner'

export interface UsageRecordsOptions {
  readonly orgId: string
  readonly apiKeyId: string
  readonly records: ReadonlyArray<{
    readonly id?: string
    readonly bifrostLogId?: string
    readonly model?: string
    readonly inputTokens?: number
    readonly outputTokens?: number
    readonly creditCost: number
    readonly occurredAt: string
  }>
}

export function usageRecordsStep(builder: ScenarioRunner, opts: UsageRecordsOptions): ScenarioRunner {
  builder.__pushStep(async () => {
    let index = 0
    for (const record of opts.records) {
      index++
      await builder.app.seed.usageRecord({
        id: record.id ?? `usage-${opts.orgId}-${index}`,
        bifrostLogId: record.bifrostLogId ?? `bif-${opts.orgId}-${index}`,
        orgId: opts.orgId,
        apiKeyId: opts.apiKeyId,
        model: record.model ?? 'gpt-4',
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        creditCost: record.creditCost,
        occurredAt: record.occurredAt,
      })
    }
  })
  return builder
}
