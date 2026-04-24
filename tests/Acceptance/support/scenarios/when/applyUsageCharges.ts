import type { ApplyUsageChargesService } from '@/Modules/Credit/Application/Services/ApplyUsageChargesService'
import type { ScenarioRunner } from '../runner'

export interface ApplyUsageChargesOptions {
  readonly orgIds: readonly string[]
  readonly startTime?: string
  readonly endTime?: string
}

export function applyUsageChargesStep(
  builder: ScenarioRunner,
  opts: ApplyUsageChargesOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const service = builder.app.container.make('applyUsageChargesService') as ApplyUsageChargesService
    const result = await service.execute(opts)
    builder.app.lastResult.set(result)
  })
  return builder
}
