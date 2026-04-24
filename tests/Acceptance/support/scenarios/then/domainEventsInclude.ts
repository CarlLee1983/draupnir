import type { ScenarioRunner } from '../runner'

export interface DomainEventMatcher {
  readonly eventType: string
  readonly data?: Readonly<Record<string, unknown>>
}

export function domainEventsIncludeStep(
  builder: ScenarioRunner,
  matchers: readonly DomainEventMatcher[],
): ScenarioRunner {
  builder.__pushStep(async () => {
    for (const matcher of matchers) {
      const found = builder.app.events.find(
        (event) =>
          event.eventType === matcher.eventType &&
          (!matcher.data || matchPartial(event.data, matcher.data as Record<string, unknown>)),
      )
      if (!found) {
        throw new Error(
          `domainEventsInclude: missing event ${matcher.eventType}${matcher.data ? ` data=${JSON.stringify(matcher.data)}` : ''}. Captured: ${builder.app.events
            .map((event) => event.eventType)
            .join(', ')}`,
        )
      }
    }
  })
  return builder
}

function matchPartial(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  for (const key of Object.keys(expected)) {
    if (actual[key] !== expected[key]) return false
  }
  return true
}
