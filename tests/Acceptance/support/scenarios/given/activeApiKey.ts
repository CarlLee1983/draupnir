import type { ScenarioRunner } from '../runner'

export interface ActiveApiKeyOptions {
  readonly orgId: string
  readonly keyId: string
  readonly createdByUserId: string
  readonly label?: string
  readonly scope?: { rateLimitRpm?: number; rateLimitTpm?: number }
}

export function activeApiKeyStep(builder: ScenarioRunner, opts: ActiveApiKeyOptions): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.apiKey({
      id: opts.keyId,
      orgId: opts.orgId,
      createdByUserId: opts.createdByUserId,
      label: opts.label ?? `Key ${opts.keyId}`,
      status: 'active',
      scope: opts.scope ?? { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
  })
  return builder
}
