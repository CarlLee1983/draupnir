import type { ScenarioRunner } from '../runner'
import { apiKeyIsActiveStep } from './apiKeyIsActive'
import { type ApiKeySuspendedMatcher, apiKeyIsSuspendedStep } from './apiKeyIsSuspended'
import { creditBalanceIsStep } from './creditBalanceIs'
import {
  type CreditTransactionMatcher,
  creditTransactionExistsStep,
} from './creditTransactionExists'
import { type DomainEventMatcher, domainEventsIncludeStep } from './domainEventsInclude'
import {
  type GatewayKeyRateLimitMatcher,
  gatewayKeyRateLimitStep,
} from './gatewayKeyRateLimit'

export interface ThenNamespace {
  creditBalanceIs(orgId: string, expected: string): ScenarioRunner
  creditTransactionExists(match: CreditTransactionMatcher): ScenarioRunner
  apiKeyIsSuspended(keyId: string, match?: ApiKeySuspendedMatcher): ScenarioRunner
  apiKeyIsActive(keyId: string): ScenarioRunner
  gatewayKeyRateLimit(gatewayKeyId: string, expected: GatewayKeyRateLimitMatcher): ScenarioRunner
  domainEventsInclude(matchers: readonly DomainEventMatcher[]): ScenarioRunner
}

export function defineThen(builder: ScenarioRunner): ThenNamespace {
  return {
    creditBalanceIs: (orgId, expected) => creditBalanceIsStep(builder, orgId, expected),
    creditTransactionExists: (match) => creditTransactionExistsStep(builder, match),
    apiKeyIsSuspended: (keyId, match) => apiKeyIsSuspendedStep(builder, keyId, match),
    apiKeyIsActive: (keyId) => apiKeyIsActiveStep(builder, keyId),
    gatewayKeyRateLimit: (gatewayKeyId, expected) =>
      gatewayKeyRateLimitStep(builder, gatewayKeyId, expected),
    domainEventsInclude: (matchers) => domainEventsIncludeStep(builder, matchers),
  }
}
