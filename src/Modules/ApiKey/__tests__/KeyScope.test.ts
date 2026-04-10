import { describe, it, expect } from 'vitest'
import { KeyScope } from '../Domain/ValueObjects/KeyScope'

describe('KeyScope', () => {
  it('應建立預設 scope（無限制）', () => {
    const scope = KeyScope.unrestricted()
    expect(scope.getAllowedModels()).toBeNull()
    expect(scope.getRateLimitRpm()).toBeNull()
    expect(scope.getRateLimitTpm()).toBeNull()
  })

  it('應建立有模型白名單的 scope', () => {
    const scope = KeyScope.create({ allowedModels: ['gpt-4', 'claude-3'] })
    expect(scope.getAllowedModels()).toEqual(['gpt-4', 'claude-3'])
  })

  it('應建立有速率限制的 scope', () => {
    const scope = KeyScope.create({ rateLimitRpm: 100, rateLimitTpm: 50000 })
    expect(scope.getRateLimitRpm()).toBe(100)
    expect(scope.getRateLimitTpm()).toBe(50000)
  })

  it('空模型列表應視為無限制', () => {
    const scope = KeyScope.create({ allowedModels: [] })
    expect(scope.getAllowedModels()).toBeNull()
  })

  it('RPM 負值應拋錯', () => {
    expect(() => KeyScope.create({ rateLimitRpm: -1 })).toThrow()
  })

  it('TPM 負值應拋錯', () => {
    expect(() => KeyScope.create({ rateLimitTpm: -1 })).toThrow()
  })

  it('應正確序列化為 JSON', () => {
    const scope = KeyScope.create({ allowedModels: ['gpt-4'], rateLimitRpm: 60 })
    const json = scope.toJSON()
    expect(json.allowed_models).toEqual(['gpt-4'])
    expect(json.rate_limit_rpm).toBe(60)
  })

  it('應從 JSON 反序列化', () => {
    const scope = KeyScope.fromJSON({
      allowed_models: ['gpt-4'],
      rate_limit_rpm: 60,
      rate_limit_tpm: null,
    })
    expect(scope.getAllowedModels()).toEqual(['gpt-4'])
    expect(scope.getRateLimitRpm()).toBe(60)
  })
})
