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
          message: 'Read scope cannot invoke model',
        }
      }

      if (auth.boundModuleIds.length > 0 && !auth.boundModuleIds.includes(SDK_MODULE_ID)) {
        return {
          success: false,
          error: 'MODULE_NOT_ALLOWED',
          message: 'This App Key is not bound to the ai_chat module',
        }
      }

      if (!request.model) {
        return { success: false, error: 'MISSING_MODEL', message: 'Missing model parameter' }
      }

      if (!request.messages || request.messages.length === 0) {
        return { success: false, error: 'MISSING_MESSAGES', message: 'Missing messages parameter' }
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
