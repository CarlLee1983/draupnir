import type { ScenarioRunner } from '../runner'

export function creditBalanceIsStep(
  builder: ScenarioRunner,
  orgId: string,
  expected: string,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const row = (await builder.app.db
      .table('credit_accounts')
      .where('org_id', '=', orgId)
      .first()) as { balance?: string | number } | null
    if (!row) {
      throw new Error(`creditBalanceIs(${orgId}, ${expected}): no credit account row`)
    }
    if (String(row.balance) !== expected) {
      throw new Error(
        `creditBalanceIs(${orgId}): expected ${expected}, actual ${row.balance ?? 'undefined'}`,
      )
    }
  })
  return builder
}
