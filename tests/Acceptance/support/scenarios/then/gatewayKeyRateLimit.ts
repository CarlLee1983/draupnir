import type { ScenarioRunner } from '../runner'

export interface GatewayKeyRateLimitMatcher {
  readonly tokenMaxLimit?: number
  readonly requestMaxLimit?: number
  readonly tokenResetDuration?: string
  readonly requestResetDuration?: string
}

export function gatewayKeyRateLimitStep(
  builder: ScenarioRunner,
  gatewayKeyId: string,
  expected: GatewayKeyRateLimitMatcher,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const calls = builder.app.gateway.calls.updateKey.filter((c) => c.keyId === gatewayKeyId)
    if (calls.length === 0) {
      throw new Error(`gatewayKeyRateLimit(${gatewayKeyId}): no updateKey call captured`)
    }
    const last = calls[calls.length - 1]
    const actual = last.request.rateLimit ?? {}
    for (const key of Object.keys(expected) as (keyof GatewayKeyRateLimitMatcher)[]) {
      const expectedValue = expected[key]
      const actualValue = (actual as Record<string, unknown>)[key]
      if (expectedValue !== undefined && actualValue !== expectedValue) {
        throw new Error(
          `gatewayKeyRateLimit(${gatewayKeyId}): ${key} expected ${String(expectedValue)}, actual ${String(actualValue)}`,
        )
      }
    }
  })
  return builder
}
