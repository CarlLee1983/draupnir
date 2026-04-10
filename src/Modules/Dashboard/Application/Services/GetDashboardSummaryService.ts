import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { UsageAggregator } from '../../Infrastructure/Services/UsageAggregator'
import type { DashboardSummaryResponse } from '../DTOs/DashboardDTO'

export class GetDashboardSummaryService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly usageAggregator: UsageAggregator,
  ) {}

  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<DashboardSummaryResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        orgId,
        callerUserId,
        callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: '無權存取此組織的 Dashboard',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const [keys, totalKeys, activeKeys] = await Promise.all([
        this.apiKeyRepository.findByOrgId(orgId),
        this.apiKeyRepository.countByOrgId(orgId),
        this.apiKeyRepository.countActiveByOrgId(orgId),
      ])

      const virtualKeyIds = keys
        .filter((k) => k.status === 'active')
        .map((k) => k.gatewayKeyId)
        .filter((id) => id.length > 0)

      const usage = await this.usageAggregator.getStats(virtualKeyIds)

      return {
        success: true,
        message: '查詢成功',
        data: { totalKeys, activeKeys, usage },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
