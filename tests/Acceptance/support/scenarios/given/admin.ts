import type { ScenarioRunner } from '../runner'

export interface AdminOptions {
  readonly userId: string
  readonly email?: string
}

export function adminStep(builder: ScenarioRunner, opts: AdminOptions): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.user({
      id: opts.userId,
      email: opts.email ?? `${opts.userId}@admin.test`,
      role: 'admin',
    })
  })
  return builder
}
