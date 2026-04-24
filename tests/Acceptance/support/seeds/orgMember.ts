import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedOrgMemberInput {
  readonly id?: string
  readonly orgId: string
  readonly userId: string
  readonly role?: 'member' | 'manager'
}

export interface SeedOrgMemberResult {
  readonly id: string
  readonly orgId: string
  readonly userId: string
  readonly role: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedOrgMember(
  db: IDatabaseAccess,
  input: SeedOrgMemberInput,
): Promise<SeedOrgMemberResult> {
  const id = input.id ?? `mem-${input.orgId}-${input.userId}`
  const role = input.role ?? 'member'
  await db.table('organization_members').insert({
    id,
    organization_id: input.orgId,
    user_id: input.userId,
    role,
    joined_at: NOW,
    created_at: NOW,
  })
  return { id, orgId: input.orgId, userId: input.userId, role }
}
