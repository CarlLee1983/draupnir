import type { ScenarioRunner } from '../runner'

export interface MemberOptions {
  readonly userId: string
  readonly orgId: string
  readonly email?: string
  readonly role?: 'member' | 'manager'
}

export function memberStep(builder: ScenarioRunner, opts: MemberOptions): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.user({
      id: opts.userId,
      email: opts.email ?? `${opts.userId}@member.test`,
      role: 'user',
    })
    await builder.app.seed.orgMember({
      orgId: opts.orgId,
      userId: opts.userId,
      role: opts.role ?? 'member',
    })
  })
  return builder
}
