import type { ScenarioRunner } from '../runner'

export interface CreditAccountOptions {
  readonly orgId: string
  readonly id?: string
  readonly balance?: string
  readonly lowBalanceThreshold?: string
  readonly status?: 'active' | 'frozen'
}

export function creditAccountStep(
  builder: ScenarioRunner,
  opts: CreditAccountOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.creditAccount(opts)
  })
  return builder
}
