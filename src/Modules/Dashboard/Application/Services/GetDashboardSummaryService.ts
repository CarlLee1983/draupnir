import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { DashboardSummaryResponse } from '../DTOs/DashboardDTO'
import type { IUsageAggregator } from '../Ports/IUsageAggregator'
import { DashboardKeyScopeResolver } from './DashboardKeyScopeResolver'

export class GetDashboardSummaryService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly usageAggregator: IUsageAggregator,
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
          message: "Unauthorized to access this organization's dashboard",
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const keys = await this.apiKeyRepository.findByOrgId(orgId)
      const visibleKeys = DashboardKeyScopeResolver.resolveVisibleKeys(keys, {
        callerUserId,
        callerSystemRole,
        orgMembershipRole: authResult.membership?.role,
      })

      const totalKeys = visibleKeys.length
      const activeKeys = visibleKeys.filter((k) => k.status === 'active').length

      const virtualKeyIds = visibleKeys
        .filter((k) => k.status === 'active')
        .map((k) => k.gatewayKeyId)
        .filter((id) => id.length > 0)

      const usage = await this.usageAggregator.getStats(virtualKeyIds)

      return {
        success: true,
        message: 'Query successful',
        data: { totalKeys, activeKeys, usage },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}
