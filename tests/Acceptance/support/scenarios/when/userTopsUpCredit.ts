import type { TopUpCreditService } from '@/Modules/Credit/Application/Services/TopUpCreditService'
import type { ScenarioRunner } from '../runner'

export interface UserTopsUpCreditOptions {
  readonly orgId: string
  readonly amount: string
  readonly callerUserId: string
  readonly callerSystemRole?: string
  readonly description?: string
}

export function userTopsUpCreditStep(
  builder: ScenarioRunner,
  opts: UserTopsUpCreditOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const service = builder.app.container.make('topUpCreditService') as TopUpCreditService
    const result = await service.execute({
      orgId: opts.orgId,
      amount: opts.amount,
      description: opts.description,
      callerUserId: opts.callerUserId,
      callerSystemRole: opts.callerSystemRole ?? 'admin',
    })
    builder.app.lastResult.set(result)
  })
  return builder
}
