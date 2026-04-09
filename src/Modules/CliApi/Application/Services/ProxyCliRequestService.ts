// src/Modules/CliApi/Application/Services/ProxyCliRequestService.ts
import type { ProxyCliRequestBody } from '../DTOs/DeviceFlowDTO'

interface ProxyRequest {
  userId: string
  body: ProxyCliRequestBody
}

interface ProxyResponse {
  success: boolean
  message: string
  data?: unknown
  error?: string
}

export interface ICliProxyClient {
  proxyRequest(body: ProxyCliRequestBody): Promise<unknown>
}

export class ProxyCliRequestService {
  constructor(private readonly client: ICliProxyClient) {}

  async execute(request: ProxyRequest): Promise<ProxyResponse> {
    try {
      if (!request.body.model || !request.body.model.trim()) {
        return { success: false, message: '模型名稱不能為空', error: 'MODEL_REQUIRED' }
      }

      if (!request.body.messages || request.body.messages.length === 0) {
        return { success: false, message: '訊息列表不能為空', error: 'MESSAGES_REQUIRED' }
      }

      const result = await this.client.proxyRequest(request.body)

      return {
        success: true,
        message: 'AI 請求完成',
        data: result,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'AI 請求代理失敗'
      return { success: false, message, error: message }
    }
  }
}
