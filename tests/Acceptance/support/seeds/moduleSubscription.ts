import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedModuleSubscriptionInput {
  readonly id?: string
  readonly orgId: string
  readonly moduleId: string
  readonly status?: string
}

export interface SeedModuleSubscriptionResult {
  readonly id: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedModuleSubscription(
  db: IDatabaseAccess,
  input: SeedModuleSubscriptionInput,
): Promise<SeedModuleSubscriptionResult> {
  const id = input.id ?? `sub-${input.orgId}-${input.moduleId}`
  await db.table('module_subscriptions').insert({
    id,
    org_id: input.orgId,
    module_id: input.moduleId,
    status: input.status ?? 'active',
    subscribed_at: NOW,
    updated_at: NOW,
  })
  return { id }
}
