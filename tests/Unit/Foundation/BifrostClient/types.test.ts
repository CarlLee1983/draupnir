// tests/Unit/Foundation/BifrostClient/types.test.ts
import { describe, it, expect } from 'bun:test'
import type {
  BifrostVirtualKey,
  CreateVirtualKeyRequest,
  UpdateVirtualKeyRequest,
  BifrostLogEntry,
  BifrostLogsQuery,
  BifrostLogsResponse,
  BifrostModel,
  BifrostModelsResponse,
  BifrostProviderConfig,
  BifrostRateLimit,
  BifrostBudget,
} from '@/Foundation/Infrastructure/Services/BifrostClient/types'

describe('Bifrost API Types', () => {
  it('should allow creating a valid CreateVirtualKeyRequest', () => {
    const request: CreateVirtualKeyRequest = {
      name: 'test-key',
      description: 'A test key',
      provider_configs: [],
      is_active: true,
    }
    expect(request.name).toBe('test-key')
    expect(request.provider_configs).toEqual([])
  })

  it('should allow creating a valid UpdateVirtualKeyRequest', () => {
    const request: UpdateVirtualKeyRequest = {
      name: 'updated-key',
      is_active: false,
    }
    expect(request.name).toBe('updated-key')
  })

  it('should represent a BifrostVirtualKey response', () => {
    const key: BifrostVirtualKey = {
      id: 'vk-123',
      name: 'my-key',
      value: 'bifrost_vk_xxx',
      description: 'test',
      is_active: true,
      provider_configs: [],
      mcp_configs: [],
    }
    expect(key.id).toBe('vk-123')
    expect(key.is_active).toBe(true)
  })

  it('should represent a BifrostLogEntry', () => {
    const log: BifrostLogEntry = {
      id: 'log-1',
      provider: 'openai',
      model: 'gpt-4',
      status: 'success',
      object: 'chat.completion',
      timestamp: '2026-04-08T00:00:00Z',
      latency: 1.5,
      cost: 0.03,
      virtual_key_id: 'vk-123',
      input_tokens: 100,
      output_tokens: 50,
    }
    expect(log.status).toBe('success')
  })

  it('should represent a BifrostModel', () => {
    const model: BifrostModel = {
      id: 'openai/gpt-4',
      name: 'GPT-4',
      context_length: 128000,
      max_input_tokens: 128000,
      max_output_tokens: 16384,
    }
    expect(model.id).toBe('openai/gpt-4')
  })
})
