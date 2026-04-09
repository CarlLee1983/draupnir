// src/Modules/CliApi/__tests__/ProxyCliRequestService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyCliRequestService } from '../Application/Services/ProxyCliRequestService'
import type { ICliProxyClient } from '../Application/Services/ProxyCliRequestService'

function createMockBifrostClient(response?: unknown): ICliProxyClient {
  return {
    proxyRequest: vi.fn().mockResolvedValue(
      response ?? {
        id: 'chatcmpl-123',
        choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      },
    ),
  } as unknown as ICliProxyClient
}

describe('ProxyCliRequestService', () => {
  let service: ProxyCliRequestService
  let mockClient: ICliProxyClient

  beforeEach(() => {
    mockClient = createMockBifrostClient()
    service = new ProxyCliRequestService(mockClient)
  })

  it('should proxy a chat completion request to Bifrost', async () => {
    const result = await service.execute({
      userId: 'user-1',
      body: {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
      },
    })
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(mockClient.proxyRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    )
  })

  it('should return error when model is missing', async () => {
    const result = await service.execute({
      userId: 'user-1',
      body: { model: '', messages: [{ role: 'user', content: 'Hi' }] },
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MODEL_REQUIRED')
  })

  it('should return error when messages are empty', async () => {
    const result = await service.execute({
      userId: 'user-1',
      body: { model: 'gpt-4', messages: [] },
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MESSAGES_REQUIRED')
  })

  it('should handle Bifrost errors gracefully', async () => {
    const failClient = {
      proxyRequest: vi.fn().mockRejectedValue(new Error('Bifrost 連線失敗')),
    } as unknown as ICliProxyClient
    const failService = new ProxyCliRequestService(failClient)

    const result = await failService.execute({
      userId: 'user-1',
      body: { model: 'gpt-4', messages: [{ role: 'user', content: 'Hi' }] },
    })
    expect(result.success).toBe(false)
    expect(result.message).toContain('Bifrost')
  })
})
