import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyScope } from '../Domain/ValueObjects/KeyScope'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'

describe('ApiKeyBifrostSync', () => {
  let mock: MockGatewayClient
  let sync: ApiKeyBifrostSync
  let orgRepo: OrganizationRepository

  beforeEach(async () => {
    mock = new MockGatewayClient()
    orgRepo = new OrganizationRepository(new MemoryDatabaseAccess())
    // 預置一個已完成 provisioning 的 org（gatewayTeamId 已寫回）。
    const provisioned = Organization.create('org-1', 'org-1', '').attachGatewayTeam(
      'gateway-team-org-1',
    )
    await orgRepo.save(provisioned)
    sync = new ApiKeyBifrostSync(mock, orgRepo)
  })

  afterEach(() => {
    mock.reset()
  })

  it('createVirtualKey 應呼叫 gateway 並以 org 的 gatewayTeamId 作為 teamId', async () => {
    const result = await sync.createVirtualKey('My Key', 'org-1')
    expect(result.gatewayKeyId).toBe('mock_vk_000001')
    expect(result.gatewayKeyValue).toBe('mock_raw_key_000001')
    expect(mock.calls.createKey[0].name).toBe('My Key')
    expect(mock.calls.createKey[0].teamId).toBe('gateway-team-org-1')
    expect(mock.calls.createKey[0].customerId).toBeUndefined()
    expect(mock.calls.createKey[0].keyIds).toEqual(['*'])
  })

  it('org 尚未 provision 完 gatewayTeamId 時，createVirtualKey 仍會建立 key 但不帶 teamId', async () => {
    const naked = Organization.create('org-naked', 'org-naked', '')
    await orgRepo.save(naked)
    await sync.createVirtualKey('Unscoped', 'org-naked')
    expect(mock.calls.createKey[0].teamId).toBeUndefined()
  })

  it('createVirtualKey 可附帶 budget（7d／30d）', async () => {
    await sync.createVirtualKey('Cap Key', 'org-1', {
      budget: { maxLimit: 50, resetDuration: '7d' },
    })
    expect(mock.calls.createKey[0].budget).toEqual({
      maxLimit: 50,
      resetDuration: '7d',
    })
  })

  it('updateVirtualKeyBudget 應只更新 gateway budget', async () => {
    const created = await mock.createKey({ name: 'k', isActive: true })
    await sync.updateVirtualKeyBudget(created.id, { maxLimit: 99, resetDuration: '30d' })
    expect(mock.calls.updateKey[0].keyId).toBe(created.id)
    expect(mock.calls.updateKey[0].request.budget).toEqual({
      maxLimit: 99,
      resetDuration: '30d',
    })
  })

  it('syncPermissions 應將 scope 以 camelCase 欄位同步至 gateway', async () => {
    const created = await mock.createKey({ name: 'test-key', isActive: true })
    const scope = KeyScope.create({
      allowedModels: ['gpt-4'],
      rateLimitRpm: 60,
      rateLimitTpm: 50000,
    })
    await sync.syncPermissions(created.id, scope)
    expect(mock.calls.updateKey[0].keyId).toBe(created.id)
    expect(mock.calls.updateKey[0].request.providerConfigs?.[0].allowedModels).toContain('gpt-4')
    expect(mock.calls.updateKey[0].request.rateLimit?.requestMaxLimit).toBe(60)
    expect(mock.calls.updateKey[0].request.rateLimit?.tokenMaxLimit).toBe(50000)
  })

  it('deactivateVirtualKey 應停用 gateway virtual key', async () => {
    const created = await mock.createKey({ name: 'test-key', isActive: true })
    await sync.deactivateVirtualKey(created.id)
    expect(mock.calls.updateKey[0].request.isActive).toBe(false)
  })

  it('deleteVirtualKey 應刪除 gateway virtual key', async () => {
    await sync.deleteVirtualKey('bfr-vk-1')
    expect(mock.calls.deleteKey[0]).toBe('bfr-vk-1')
  })
})
