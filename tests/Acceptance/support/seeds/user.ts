import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedUserInput {
  readonly id: string
  readonly email: string
  readonly password?: string
  readonly role?: string
  readonly status?: string
}

export interface SeedUserResult {
  readonly id: string
  readonly email: string
  readonly role: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedUser(db: IDatabaseAccess, input: SeedUserInput): Promise<SeedUserResult> {
  const role = input.role ?? 'user'
  await db.table('users').insert({
    id: input.id,
    email: input.email,
    password: input.password ?? '$acceptance$placeholder',
    role,
    status: input.status ?? 'active',
    created_at: NOW,
    updated_at: NOW,
  })
  return { id: input.id, email: input.email, role }
}
