import type { TestApp } from '../TestApp'
import { ScenarioRunner } from './runner'

export { ScenarioRunner } from './runner'
export type { GivenNamespace } from './given'
export type { WhenNamespace } from './when'
export type { ThenNamespace } from './then'

export function scenario(app: TestApp): ScenarioRunner {
  return new ScenarioRunner(app)
}
