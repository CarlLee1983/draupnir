import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedCreditAccountInput {
  readonly id?: string
  readonly orgId: string
  readonly balance?: string
  readonly lowBalanceThreshold?: string
  readonly status?: 'active' | 'frozen'
}

export interface SeedCreditAccountResult {
  readonly id: string
  readonly orgId: string
  readonly balance: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedCreditAccount(
  db: IDatabaseAccess,
  input: SeedCreditAccountInput,
): Promise<SeedCreditAccountResult> {
  const id = input.id ?? `acc-${input.orgId}`
  const balance = input.balance ?? '0'
  await db.table('credit_accounts').insert({
    id,
    org_id: input.orgId,
    balance,
    low_balance_threshold: input.lowBalanceThreshold ?? '100',
    status: input.status ?? 'active',
    created_at: NOW,
    updated_at: NOW,
  })
  return { id, orgId: input.orgId, balance }
}
