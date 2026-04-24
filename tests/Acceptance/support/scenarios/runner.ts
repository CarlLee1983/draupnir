import type { TestApp } from '../TestApp'
import { defineGiven, type GivenNamespace } from './given'
import { defineThen, type ThenNamespace } from './then'
import { defineWhen, type WhenNamespace } from './when'

export type Step = () => Promise<void>

/**
 * Scenario builder. The given/when/then namespaces are filled by
 * the helper modules under `./given/`, `./when/`, `./then/`.
 */
export class ScenarioRunner {
  private readonly steps: Step[] = []

  readonly given: GivenNamespace
  readonly when: WhenNamespace
  // biome-ignore lint/suspicious/noThenProperty: scenario DSL intentionally exposes a `then` namespace
  readonly then: ThenNamespace

  constructor(readonly app: TestApp) {
    this.given = defineGiven(this)
    this.when = defineWhen(this)
    // biome-ignore lint/suspicious/noThenProperty: scenario DSL intentionally exposes a `then` namespace
    this.then = defineThen(this)
  }

  __pushStep(step: Step): this {
    this.steps.push(step)
    return this
  }

  async run(): Promise<void> {
    for (let i = 0; i < this.steps.length; i++) {
      try {
        await this.steps[i]()
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`scenario step ${i + 1} failed: ${message}`, {
          cause: error instanceof Error ? error : undefined,
        })
      }
    }
  }
}
