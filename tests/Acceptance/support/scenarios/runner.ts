import type { TestApp } from '../TestApp'

export type Step = () => Promise<void>

/**
 * Scenario builder skeleton. PR-2 extends given/when/then namespaces.
 */
export class ScenarioRunner {
  private readonly steps: Step[] = []

  constructor(readonly app: TestApp) {}

  /** Enqueue a raw step. */
  __pushStep(step: Step): this {
    this.steps.push(step)
    return this
  }

  readonly given = {} as Record<string, never>
  readonly when = {} as Record<string, never>
  // biome-ignore lint/suspicious/noThenProperty: scenario DSL intentionally exposes a `then` namespace
  readonly then = {} as Record<string, never>

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
