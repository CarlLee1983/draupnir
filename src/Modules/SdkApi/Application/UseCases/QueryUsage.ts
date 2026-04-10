import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { AppAuthContext, UsageResponse } from '../DTOs/SdkApiDTO'

interface QueryUsageOptions {
  startDate?: string
  endDate?: string
}

export class QueryUsage {
  constructor(private readonly gatewayClient: ILLMGatewayClient) {}

  async execute(auth: AppAuthContext, options?: QueryUsageOptions): Promise<UsageResponse> {
    try {
      const query =
        options?.startDate || options?.endDate
          ? { startTime: options.startDate, endTime: options.endDate }
          : undefined

      const stats = await this.gatewayClient.getUsageStats([auth.bifrostVirtualKeyId], query)

      return {
        success: true,
        message: '查詢成功',
        data: {
          totalRequests: stats.totalRequests,
          totalCost: stats.totalCost,
          totalTokens: stats.totalTokens,
          avgLatency: stats.avgLatency,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢用量失敗'
      return { success: false, message, error: 'USAGE_QUERY_ERROR' }
    }
  }
}
