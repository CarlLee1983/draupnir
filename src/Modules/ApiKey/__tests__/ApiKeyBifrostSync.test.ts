import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { KeyScope } from '../Domain/ValueObjects/KeyScope'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'

describe('ApiKeyBifrostSync', () => {
  let mock: MockGatewayClient
  let sync: ApiKeyBifrostSync

  beforeEach(() => {
    mock = new MockGatewayClient()
    sync = new ApiKeyBifrostSync(mock)
  })

  afterEach(() => {
    mock.reset()
  })

  it('createVirtualKey 應呼叫 gateway 並回傳 ID 及 key value', async () => {
    const result = await sync.createVirtualKey('My Key', 'org-1')
    expect(result.gatewayKeyId).toBe('mock_vk_000001')
    expect(result.gatewayKeyValue).toBe('mock_raw_key_000001')
    expect(mock.calls.createKey[0].name).toBe('My Key')
    expect(mock.calls.createKey[0].customerId).toBeUndefined()
    expect(mock.calls.createKey[0].keyIds).toEqual(['*'])
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
