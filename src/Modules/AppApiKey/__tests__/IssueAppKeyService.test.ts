import { beforeEach, describe, expect, it } from 'vitest'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { IssueAppKeyService } from '../Application/Services/IssueAppKeyService'
import { AppApiKeyRepository } from '../Infrastructure/Repositories/AppApiKeyRepository'
import { AppKeyBifrostSync } from '../Infrastructure/Services/AppKeyBifrostSync'

const hashingService = new KeyHashingService()

function createMockSync(shouldFail = false): AppKeyBifrostSync {
  const gatewayMock = new MockGatewayClient()
  if (shouldFail) {
    gatewayMock.failNext(new GatewayError('Bifrost 連線失敗', 'NETWORK', 503, true))
  }
  return new AppKeyBifrostSync(gatewayMock)
}

describe('IssueAppKeyService', () => {
  let service: IssueAppKeyService
  let db: MemoryDatabaseAccess
  let appKeyRepo: AppApiKeyRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    appKeyRepo = new AppApiKeyRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const sync = createMockSync()
    service = new IssueAppKeyService(appKeyRepo, orgAuth, sync, hashingService)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', new OrgMemberRole('manager'))
    await memberRepo.save(member)
  })

  it('應成功配發 App Key 並回傳 rawKey（drp_app_ 前綴）', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'My SDK App Key',
    })
    expect(result.success).toBe(true)
    expect(result.data?.rawKey).toBeTruthy()
    expect((result.data?.rawKey as string).startsWith('drp_app_')).toBe(true)
    expect(result.data?.status).toBe('active')
    expect(result.data?.scope).toBe('read')
  })

  it('應支援自訂 scope 和綁定模組', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Admin Key',
      scope: 'admin',
      boundModuleIds: ['mod-1', 'mod-2'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.scope).toBe('admin')
    expect(result.data?.boundModules).toEqual(['mod-1', 'mod-2'])
  })

  it('應支援自動輪換策略', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Auto Rotate Key',
      rotationPolicy: { autoRotate: true, rotationIntervalDays: 90, gracePeriodHours: 48 },
    })
    expect(result.success).toBe(true)
    const policy = result.data?.rotationPolicy as Record<string, unknown>
    expect(policy.auto_rotate).toBe(true)
    expect(policy.rotation_interval_days).toBe(90)
  })

  it('非 Org 成員應回傳錯誤', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      issuedByUserId: 'outsider',
      callerSystemRole: 'user',
      label: 'Unauthorized',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('空 label 應回傳錯誤', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      callerSystemRole: 'user',
      label: '',
    })
    expect(result.success).toBe(false)
  })

  it('Bifrost 失敗時應清理本地 pending 記錄', async () => {
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const failSync = createMockSync(true)
    const failService = new IssueAppKeyService(appKeyRepo, orgAuth, failSync, hashingService)

    const result = await failService.execute({
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Will Fail',
    })
    expect(result.success).toBe(false)
    const keys = await appKeyRepo.findByOrgId('org-1')
    expect(keys).toHaveLength(0)
  })
})
