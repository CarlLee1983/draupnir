import { CORE_APP_MODULE_SPECS } from '@/Modules/AppModule/Domain/CoreAppModules'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedAppModuleInput {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly type?: string
  readonly status?: string
}

export interface SeedAppModuleResult {
  readonly id: string
  readonly name: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedAppModule(
  db: IDatabaseAccess,
  input: SeedAppModuleInput,
): Promise<SeedAppModuleResult> {
  await db.table('app_modules').insert({
    id: input.id,
    name: input.name,
    description: input.description ?? null,
    type: input.type ?? 'free',
    status: input.status ?? 'active',
    created_at: NOW,
    updated_at: NOW,
  })
  return { id: input.id, name: input.name }
}

export async function seedAllCoreAppModules(
  db: IDatabaseAccess,
): Promise<readonly SeedAppModuleResult[]> {
  const out: SeedAppModuleResult[] = []
  for (const spec of CORE_APP_MODULE_SPECS) {
    out.push(await seedAppModule(db, { id: spec.id, name: spec.name, description: spec.description }))
  }
  return out
}
