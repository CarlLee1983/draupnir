import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ConfigureWebhookService } from '../Application/Services/ConfigureWebhookService'
import { ApplicationRepository } from '../Infrastructure/Repositories/ApplicationRepository'
import { WebhookConfigRepository } from '../Infrastructure/Repositories/WebhookConfigRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { Application } from '../Domain/Aggregates/Application'

describe('ConfigureWebhookService', () => {
  let service: ConfigureWebhookService
  let db: MemoryDatabaseAccess
  let appRepo: ApplicationRepository
  let webhookConfigRepo: WebhookConfigRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    appRepo = new ApplicationRepository(db)
    webhookConfigRepo = new WebhookConfigRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    service = new ConfigureWebhookService(appRepo, webhookConfigRepo, orgAuth)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    const app = Application.create({
      id: 'app-1',
      name: 'Test App',
      description: 'Test',
      orgId: 'org-1',
      createdByUserId: 'user-1',
    })
    await appRepo.save(app)
  })

  it('應成功設定 webhook URL 和事件訂閱', async () => {
    const result = await service.execute({
      applicationId: 'app-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      webhookUrl: 'https://example.com/webhook',
      eventTypes: ['usage.threshold', 'key.revoked'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.webhookUrl).toBe('https://example.com/webhook')
    expect(result.data?.webhookSecret).toBeTruthy()
    expect(result.data?.webhookSecret).toMatch(/^whsec_/)
    expect(result.data?.subscribedEvents).toEqual(['usage.threshold', 'key.revoked'])
  })

  it('應在 Application 上更新 webhook URL', async () => {
    await service.execute({
      applicationId: 'app-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      webhookUrl: 'https://example.com/hook',
      eventTypes: ['credit.low'],
    })
    const updatedApp = await appRepo.findById('app-1')
    expect(updatedApp?.webhookUrl).toBe('https://example.com/hook')
    expect(updatedApp?.webhookSecret).toBeTruthy()
  })

  it('應建立 WebhookConfig 記錄', async () => {
    await service.execute({
      applicationId: 'app-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      webhookUrl: 'https://example.com/hook',
      eventTypes: ['usage.threshold', 'key.expiring', 'credit.low'],
    })
    const configs = await webhookConfigRepo.findByApplicationId('app-1')
    expect(configs).toHaveLength(3)
    const types = configs.map((c) => c.eventType).sort()
    expect(types).toEqual(['credit.low', 'key.expiring', 'usage.threshold'])
  })

  it('重新設定時應替換既有的 webhook configs', async () => {
    await service.execute({
      applicationId: 'app-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      webhookUrl: 'https://example.com/hook',
      eventTypes: ['usage.threshold', 'key.revoked'],
    })

    await service.execute({
      applicationId: 'app-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      webhookUrl: 'https://example.com/hook2',
      eventTypes: ['credit.low'],
    })

    const configs = await webhookConfigRepo.findByApplicationId('app-1')
    expect(configs).toHaveLength(1)
    expect(configs[0].eventType).toBe('credit.low')
    const updatedApp = await appRepo.findById('app-1')
    expect(updatedApp?.webhookUrl).toBe('https://example.com/hook2')
  })

  it('非 HTTPS URL 應回傳錯誤', async () => {
    const result = await service.execute({
      applicationId: 'app-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      webhookUrl: 'http://example.com/hook',
      eventTypes: ['credit.low'],
    })
    expect(result.success).toBe(false)
  })

  it('不存在的 Application 應回傳錯誤', async () => {
    const result = await service.execute({
      applicationId: 'app-nonexist',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      webhookUrl: 'https://example.com/hook',
      eventTypes: ['credit.low'],
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('APP_NOT_FOUND')
  })

  it('無效的事件類型應回傳錯誤', async () => {
    const result = await service.execute({
      applicationId: 'app-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      webhookUrl: 'https://example.com/hook',
      eventTypes: ['invalid.event'],
    })
    expect(result.success).toBe(false)
  })

  it('非 Org 成員應回傳錯誤', async () => {
    const result = await service.execute({
      applicationId: 'app-1',
      callerUserId: 'outsider',
      callerSystemRole: 'user',
      webhookUrl: 'https://example.com/hook',
      eventTypes: ['credit.low'],
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })
})
