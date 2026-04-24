import type { ScenarioRunner } from '../runner'

export interface OrganizationOptions {
  readonly name?: string
  readonly slug?: string
}

export function organizationStep(
  builder: ScenarioRunner,
  id: string,
  opts?: OrganizationOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.organization({ id, name: opts?.name ?? `Org ${id}`, slug: opts?.slug })
  })
  return builder
}
