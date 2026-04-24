import type { ScenarioRunner } from '../runner'

export interface CreditTransactionMatcher {
  readonly orgId: string
  readonly type: 'topup' | 'deduction' | 'refund' | 'expiry' | 'adjustment'
  readonly amount?: string
  readonly referenceType?: string
  readonly referenceId?: string
}

export function creditTransactionExistsStep(
  builder: ScenarioRunner,
  match: CreditTransactionMatcher,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const acc = (await builder.app.db
      .table('credit_accounts')
      .where('org_id', '=', match.orgId)
      .first()) as { id?: string } | null
    if (!acc?.id) {
      throw new Error(`creditTransactionExists: no account for org ${match.orgId}`)
    }
    let query = builder.app.db
      .table('credit_transactions')
      .where('credit_account_id', '=', acc.id)
      .where('type', '=', match.type)
    if (match.amount !== undefined) query = query.where('amount', '=', match.amount)
    if (match.referenceType !== undefined) query = query.where('reference_type', '=', match.referenceType)
    if (match.referenceId !== undefined) query = query.where('reference_id', '=', match.referenceId)
    const rows = await query.select()
    if (rows.length === 0) {
      throw new Error(
        `creditTransactionExists: no row matched ${JSON.stringify(match)} (account ${acc.id})`,
      )
    }
  })
  return builder
}
