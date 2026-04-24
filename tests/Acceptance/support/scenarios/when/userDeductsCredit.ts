import type { DeductCreditService } from '@/Modules/Credit/Application/Services/DeductCreditService'
import type { ScenarioRunner } from '../runner'

export interface UserDeductsCreditOptions {
  readonly orgId: string
  readonly amount: string
  readonly referenceType?: string
  readonly referenceId?: string
  readonly description?: string
}

export function userDeductsCreditStep(
  builder: ScenarioRunner,
  opts: UserDeductsCreditOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const service = builder.app.container.make('deductCreditService') as DeductCreditService
    const result = await service.execute(opts)
    builder.app.lastResult.set(result)
  })
  return builder
}
