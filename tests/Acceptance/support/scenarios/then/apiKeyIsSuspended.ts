import type { ScenarioRunner } from '../runner'

export interface ApiKeySuspendedMatcher {
  readonly reason?: string
}

export function apiKeyIsSuspendedStep(
  builder: ScenarioRunner,
  keyId: string,
  match?: ApiKeySuspendedMatcher,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const row = (await builder.app.db.table('api_keys').where('id', '=', keyId).first()) as {
      status?: string
      suspension_reason?: string | null
    } | null
    if (!row) throw new Error(`apiKeyIsSuspended(${keyId}): no row`)
    if (row.status !== 'suspended_no_credit') {
      throw new Error(
        `apiKeyIsSuspended(${keyId}): expected status suspended_no_credit, actual ${row.status}`,
      )
    }
    if (match?.reason !== undefined && row.suspension_reason !== match.reason) {
      throw new Error(
        `apiKeyIsSuspended(${keyId}): expected reason ${match.reason}, actual ${row.suspension_reason ?? 'null'}`,
      )
    }
  })
  return builder
}
