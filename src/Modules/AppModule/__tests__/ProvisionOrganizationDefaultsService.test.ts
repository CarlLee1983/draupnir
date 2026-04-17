// src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts
import { describe, expect, test } from 'bun:test'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { ContractRepository } from '@/Modules/Contract/Infrastructure/Repositories/ContractRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ProvisionOrganizationDefaultsService } from '../Application/Services/ProvisionOrganizationDefaultsService'
import { AppModuleRepository } from '../Infrastructure/Repositories/AppModuleRepository'
import { ModuleSubscriptionRepository } from '../Infrastructure/Repositories/ModuleSubscriptionRepository'

describe('ProvisionOrganizationDefaultsService', () => {
  async function setup(orgId: string) {
    const db = new MemoryDatabaseAccess()
    const moduleRepo = new AppModuleRepository(db)
    const contractRepo = new ContractRepository(db)
    const subRepo = new ModuleSubscriptionRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const gateway = new MockGatewayClient()
    // Organization 必須先存在，ProvisionOrganizationDefaultsService 才能寫回 gatewayTeamId。
    await orgRepo.save(Organization.create(orgId, orgId, ''))
    const service = new ProvisionOrganizationDefaultsService(
      moduleRepo,
      contractRepo,
      subRepo,
      gateway,
      orgRepo,
      db,
    )
    return { service, moduleRepo, contractRepo, subRepo, orgRepo, gateway, db }
  }

  test('為組織建立啟用中合約、內建模組訂閱與 Bifrost Team，並寫回 gatewayTeamId', async () => {
    const { service, moduleRepo, contractRepo, subRepo, orgRepo, gateway } =
      await setup('org-new')
    await service.execute('org-new', 'user-1')

    const active = await contractRepo.findActiveByTargetId('org-new')
    expect(active).not.toBeNull()
    expect(active?.targetId).toBe('org-new')

    const dash = await moduleRepo.findByName('dashboard')
    expect(dash).not.toBeNull()

    const sub = await subRepo.findByOrgAndModule('org-new', dash!.id)
    expect(sub?.isActive()).toBe(true)

    expect(gateway.calls.ensureTeam).toHaveLength(1)
    expect(gateway.calls.ensureTeam[0]).toEqual({ name: 'org-new' })
    expect(gateway.calls.createTeam).toHaveLength(1)

    const org = await orgRepo.findById('org-new')
    expect(org?.gatewayTeamId).toBe('mock_team_000001')
  })

  test('重複 provision 時 ensureTeam 不會建立第二個 Team（冪等）', async () => {
    const { service, gateway } = await setup('org-retry')
    await service.execute('org-retry', 'user-1')
    await service.execute('org-retry', 'user-1')

    // 第二次 execute 在 FOR UPDATE 鎖下 re-read 到既有 gatewayTeamId，短路不再呼叫 ensureTeam。
    expect(gateway.calls.ensureTeam).toHaveLength(1)
    expect(gateway.calls.createTeam).toHaveLength(1)
  })

  test('第二次 execute 在 lock 下 re-read 到既有 gatewayTeamId，短路不再呼叫 ensureTeam', async () => {
    const { service, gateway } = await setup('org-short')
    await service.execute('org-short', 'user-1')
    const ensureCountAfterFirst = gateway.calls.ensureTeam.length
    expect(ensureCountAfterFirst).toBe(1)

    await service.execute('org-short', 'user-1')
    expect(gateway.calls.ensureTeam).toHaveLength(ensureCountAfterFirst)
    expect(gateway.calls.createTeam).toHaveLength(1)
  })

  test('Team 建立首次失敗後，重新 provision 可補建 Team 並寫回 gatewayTeamId', async () => {
    const { service, contractRepo, orgRepo, gateway } = await setup('org-fail')
    const { GatewayError } = await import('@/Foundation/Infrastructure/Services/LLMGateway/errors')
    gateway.failNext(new GatewayError('gateway offline', 'NETWORK', 0, true))

    await service.execute('org-fail', 'user-1')

    // 首次失敗：合約已建立，但 Team 尚未建立，gatewayTeamId 未寫入。
    const active = await contractRepo.findActiveByTargetId('org-fail')
    expect(active).not.toBeNull()
    expect(gateway.calls.createTeam).toHaveLength(0)
    const orgBefore = await orgRepo.findById('org-fail')
    expect(orgBefore?.gatewayTeamId).toBeNull()

    // 重新 provision：contract 短路，但 ensureTeam 仍會執行並補建 Team 與寫回。
    await service.execute('org-fail', 'user-1')
    expect(gateway.calls.createTeam).toHaveLength(1)
    const orgAfter = await orgRepo.findById('org-fail')
    expect(orgAfter?.gatewayTeamId).toBe('mock_team_000001')
  })
})
