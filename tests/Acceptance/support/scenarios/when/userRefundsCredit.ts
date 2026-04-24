import type { RefundCreditService } from '@/Modules/Credit/Application/Services/RefundCreditService'
import type { ScenarioRunner } from '../runner'

export interface UserRefundsCreditOptions {
  readonly orgId: string
  readonly amount: string
  readonly callerUserId: string
  readonly callerSystemRole?: string
  readonly referenceType?: string
  readonly referenceId?: string
  readonly description?: string
}

export function userRefundsCreditStep(
  builder: ScenarioRunner,
  opts: UserRefundsCreditOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const service = builder.app.container.make('refundCreditService') as RefundCreditService
    const result = await service.execute({
      orgId: opts.orgId,
      amount: opts.amount,
      callerUserId: opts.callerUserId,
      callerSystemRole: opts.callerSystemRole ?? 'admin',
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
      description: opts.description,
    })
    builder.app.lastResult.set(result)
  })
  return builder
}
