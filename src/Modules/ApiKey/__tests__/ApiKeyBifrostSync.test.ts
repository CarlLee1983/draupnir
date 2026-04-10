import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { KeyScope } from '../Domain/ValueObjects/KeyScope'

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
    expect(result.bifrostVirtualKeyId).toBe('mock_vk_000001')
    expect(result.bifrostKeyValue).toBe('mock_raw_key_000001')
    expect(mock.calls.createKey[0].name).toBe('My Key')
    expect(mock.calls.createKey[0].customerId).toBe('org-1')
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
