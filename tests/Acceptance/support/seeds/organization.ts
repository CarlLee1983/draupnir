import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedOrganizationInput {
  readonly id: string
  readonly name: string
  readonly slug?: string
  readonly description?: string
  readonly status?: string
}

export interface SeedOrganizationResult {
  readonly id: string
  readonly name: string
  readonly slug: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedOrganization(
  db: IDatabaseAccess,
  input: SeedOrganizationInput,
): Promise<SeedOrganizationResult> {
  const slug = input.slug ?? `${input.id}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
  await db.table('organizations').insert({
    id: input.id,
    name: input.name,
    slug,
    description: input.description ?? '',
    status: input.status ?? 'active',
    gateway_team_id: null,
    created_at: NOW,
    updated_at: NOW,
  })
  return { id: input.id, name: input.name, slug }
}
