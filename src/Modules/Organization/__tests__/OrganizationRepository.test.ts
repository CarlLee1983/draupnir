import { describe, expect, it } from 'bun:test'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'

describe('OrganizationRepository.findByIdForUpdate', () => {
  it('returns the org by id (memory adapter treats forUpdate as no-op)', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new OrganizationRepository(db)
    await repo.save(Organization.create('org-x', 'org-x', ''))
    const org = await repo.findByIdForUpdate('org-x')
    expect(org).not.toBeNull()
    expect(org?.id).toBe('org-x')
  })

  it('returns null when org does not exist', async () => {
    const repo = new OrganizationRepository(new MemoryDatabaseAccess())
    expect(await repo.findByIdForUpdate('missing')).toBeNull()
  })
})
