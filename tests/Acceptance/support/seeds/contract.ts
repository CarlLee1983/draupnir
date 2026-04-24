import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedContractInput {
  readonly id?: string
  readonly targetId: string
  readonly createdBy: string
  readonly allowedModules?: readonly string[]
  readonly creditQuota?: number
  readonly rpm?: number
  readonly tpm?: number
  readonly startDate?: string
  readonly endDate?: string
}

export interface SeedContractResult {
  readonly id: string
}

export async function seedContract(
  db: IDatabaseAccess,
  input: SeedContractInput,
): Promise<SeedContractResult> {
  const id = input.id ?? crypto.randomUUID()
  const terms = {
    creditQuota: input.creditQuota ?? 100000,
    allowedModules: [...(input.allowedModules ?? ['credit'])],
    rateLimit: {
      rpm: input.rpm ?? 60,
      tpm: input.tpm ?? 100000,
    },
    validityPeriod: {
      startDate: input.startDate ?? '2025-01-01T00:00:00.000Z',
      endDate: input.endDate ?? '2027-01-01T00:00:00.000Z',
    },
  }

  await db.table('contracts').insert({
    id,
    target_type: 'organization',
    target_id: input.targetId,
    status: 'active',
    terms: JSON.stringify(terms),
    created_by: input.createdBy,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  })

  return { id }
}
