import type { TestApp } from '../TestApp'
import { ScenarioRunner } from './runner'

export { ScenarioRunner } from './runner'

export function scenario(app: TestApp): ScenarioRunner {
  return new ScenarioRunner(app)
}
