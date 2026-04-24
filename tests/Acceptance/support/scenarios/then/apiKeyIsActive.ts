import type { ScenarioRunner } from '../runner'

export function apiKeyIsActiveStep(builder: ScenarioRunner, keyId: string): ScenarioRunner {
  builder.__pushStep(async () => {
    const row = (await builder.app.db.table('api_keys').where('id', '=', keyId).first()) as {
      status?: string
    } | null
    if (!row) throw new Error(`apiKeyIsActive(${keyId}): no row`)
    if (row.status !== 'active') {
      throw new Error(`apiKeyIsActive(${keyId}): expected active, actual ${row.status}`)
    }
  })
  return builder
}
