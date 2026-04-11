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
        return { success: false, message: 'Model name is required', error: 'MODEL_REQUIRED' }
      }

      if (!request.body.messages || request.body.messages.length === 0) {
        return {
          success: false,
          message: 'Messages list cannot be empty',
          error: 'MESSAGES_REQUIRED',
        }
      }

      const result = await this.client.proxyRequest(request.body)

      return {
        success: true,
        message: 'AI request completed',
        data: result,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'AI request proxy failed'
      return { success: false, message, error: message }
    }
  }
}
