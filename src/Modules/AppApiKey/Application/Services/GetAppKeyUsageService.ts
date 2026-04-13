import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { AppApiKeyResponse, GetAppKeyUsageRequest } from '../DTOs/AppApiKeyDTO'

export class GetAppKeyUsageService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly gatewayClient: ILLMGatewayClient,
  ) {}

  async execute(request: GetAppKeyUsageRequest): Promise<AppApiKeyResponse> {
    try {
      const key = await this.appApiKeyRepository.findById(request.keyId)
      if (!key) {
        return { success: false, message: 'App Key not found', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        key.orgId,
        request.callerUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'You are not a member of this organization',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const query =
        request.startDate || request.endDate
          ? { startTime: request.startDate, endTime: request.endDate }
          : undefined
      const stats = await this.gatewayClient.getUsageStats([key.gatewayKeyId], query)

      return {
        success: true,
        message: 'Usage retrieved successfully',
        data: {
          keyId: key.id,
          label: key.label,
          totalRequests: stats.totalRequests ?? 0,
          totalTokens: stats.totalTokens ?? 0,
          totalCost: stats.totalCost ?? 0,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}
