import type { ScenarioRunner } from '../runner'

export interface SuspendedApiKeyOptions {
  readonly orgId: string
  readonly keyId: string
  readonly createdByUserId: string
  readonly label?: string
  readonly preFreezeRateLimit: { rpm: number | null; tpm: number | null }
  readonly suspensionReason?: string
}

export function suspendedApiKeyStep(
  builder: ScenarioRunner,
  opts: SuspendedApiKeyOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.apiKey({
      id: opts.keyId,
      orgId: opts.orgId,
      createdByUserId: opts.createdByUserId,
      label: opts.label ?? `Key ${opts.keyId}`,
      status: 'suspended_no_credit',
      suspensionReason: opts.suspensionReason ?? 'CREDIT_DEPLETED',
      preFreezeRateLimit: opts.preFreezeRateLimit,
      scope: {
        rateLimitRpm: opts.preFreezeRateLimit.rpm ?? undefined,
        rateLimitTpm: opts.preFreezeRateLimit.tpm ?? undefined,
      },
    })
  })
  return builder
}
