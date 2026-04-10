import type { AppAuthContext, ProxyCallRequest, ProxyCallResponse } from '../DTOs/SdkApiDTO'

export type BifrostProxyFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>

const SDK_MODULE_ID = 'ai_chat'

export class ProxyModelCall {
  constructor(
    private readonly bifrostBaseUrl: string,
    private readonly fetchFn: BifrostProxyFetch = globalThis.fetch.bind(globalThis),
  ) {}

  async execute(auth: AppAuthContext, request: ProxyCallRequest): Promise<ProxyCallResponse> {
    try {
      if (auth.scope === 'read') {
        return {
          success: false,
          error: 'INSUFFICIENT_SCOPE',
          message: 'read scope 不允許呼叫模型',
        }
      }

      if (auth.boundModuleIds.length > 0 && !auth.boundModuleIds.includes(SDK_MODULE_ID)) {
        return {
          success: false,
          error: 'MODULE_NOT_ALLOWED',
          message: '此 App Key 未綁定 ai_chat 模組',
        }
      }

      if (!request.model) {
        return { success: false, error: 'MISSING_MODEL', message: '缺少 model 參數' }
      }

      if (!request.messages || request.messages.length === 0) {
        return { success: false, error: 'MISSING_MESSAGES', message: '缺少 messages 參數' }
      }

      const { model, messages, temperature, max_tokens, stream, ...rest } = request
      const bifrostPayload = {
        model,
        messages,
        ...(temperature != null && { temperature }),
        ...(max_tokens != null && { max_tokens }),
        ...(stream != null && { stream }),
        ...rest,
      }

      const url = `${this.bifrostBaseUrl}/v1/chat/completions`
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.gatewayKeyId}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bifrostPayload),
      })

      if (!response.ok) {
        let errorBody: unknown
        try {
          errorBody = await response.json()
        } catch {
          errorBody = await response.text().catch(() => null)
        }
        return {
          success: false,
          error: 'BIFROST_ERROR',
          message: `Bifrost 回傳 ${response.status}`,
          data: errorBody,
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '代理呼叫失敗'
      return { success: false, error: 'PROXY_ERROR', message }
    }
  }
}
