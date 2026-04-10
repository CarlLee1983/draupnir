import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProxyModelCall } from '../Application/UseCases/ProxyModelCall'
import type { AppAuthContext } from '../Application/DTOs/SdkApiDTO'

describe('ProxyModelCall', () => {
  let useCase: ProxyModelCall
  const bifrostBaseUrl = 'http://localhost:8787'
  const authContext: AppAuthContext = {
    appKeyId: 'appkey-1',
    orgId: 'org-1',
    gatewayKeyId: 'bfr-vk-1',
    scope: 'write',
    boundModuleIds: [],
  }

  beforeEach(() => {
    useCase = new ProxyModelCall(bifrostBaseUrl)
  })

  it('scope 為 read 時應拒絕代理呼叫', async () => {
    const readOnlyAuth: AppAuthContext = { ...authContext, scope: 'read' }
    const result = await useCase.execute(readOnlyAuth, {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'hi' }],
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INSUFFICIENT_SCOPE')
  })

  it('缺少 model 應回傳錯誤', async () => {
    const result = await useCase.execute(authContext, {
      model: '',
      messages: [{ role: 'user', content: 'hi' }],
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MISSING_MODEL')
  })

  it('缺少 messages 應回傳錯誤', async () => {
    const result = await useCase.execute(authContext, {
      model: 'gpt-4',
      messages: [],
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MISSING_MESSAGES')
  })

  it('boundModules 不為空且包含 ai_chat 時應允許呼叫', async () => {
    const boundAuth: AppAuthContext = { ...authContext, boundModuleIds: ['ai_chat'] }
    const result = await useCase.execute(boundAuth, {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'hi' }],
    })
    expect(result.error).not.toBe('INSUFFICIENT_SCOPE')
    expect(result.error).not.toBe('MODULE_NOT_ALLOWED')
  })

  it('boundModules 非空且不包含 ai_chat 時應拒絕', async () => {
    const boundAuth: AppAuthContext = { ...authContext, boundModuleIds: ['billing_only'] }
    const result = await useCase.execute(boundAuth, {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'hi' }],
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MODULE_NOT_ALLOWED')
  })

  it('成功代理呼叫應透傳 Bifrost 回應', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'chatcmpl-123',
          object: 'chat.completion',
          model: 'gpt-4',
          choices: [
            { message: { role: 'assistant', content: 'Hello!' }, index: 0, finish_reason: 'stop' },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
        { status: 200 },
      ),
    )
    const proxyWithMock = new ProxyModelCall(bifrostBaseUrl, mockFetch)

    const result = await proxyWithMock.execute(authContext, {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'hi' }],
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect((result.data as Record<string, unknown>).model).toBe('gpt-4')
    expect(mockFetch).toHaveBeenCalledWith(
      `${bifrostBaseUrl}/v1/chat/completions`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer bfr-vk-1',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('Bifrost 回傳非 200 應轉換為錯誤', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Model not found' } }), { status: 404 }),
      )
    const proxyWithMock = new ProxyModelCall(bifrostBaseUrl, mockFetch)

    const result = await proxyWithMock.execute(authContext, {
      model: 'nonexistent-model',
      messages: [{ role: 'user', content: 'hi' }],
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('BIFROST_ERROR')
  })
})
