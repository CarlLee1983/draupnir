import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { DashboardSummaryResponse } from '../DTOs/DashboardDTO'
import type { IUsageAggregator } from '../Ports/IUsageAggregator'
import { DashboardKeyScopeResolver } from './DashboardKeyScopeResolver'

/**
 * Service responsible for retrieving a high-level summary of an organization's dashboard.
 *
 * Responsibilities:
 * - Verify that the caller has permission to view the organization's dashboard.
 * - Resolve which API keys are visible to the caller based on their role and assignments.
 * - Calculate counts for total and active keys.
 * - Aggregate usage statistics (cost, requests, tokens) across all active and visible keys.
 */
export class GetDashboardSummaryService {
  /**
   * Initializes the service with required repositories and authorization helpers.
   *
   * @param apiKeyRepository Repository for accessing API key data.
   * @param orgAuth Helper for validating organization membership and permissions.
   * @param usageAggregator Service for aggregating usage metrics from gateway keys.
   */
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly usageAggregator: IUsageAggregator,
  ) {}

  /**
   * Executes the dashboard summary query.
   *
   * @param orgId The identifier of the organization to query.
   * @param callerUserId The ID of the user requesting the data.
   * @param callerSystemRole The system-level role of the requesting user.
   * @returns A promise resolving to a DashboardSummaryResponse with counts and usage metrics.
   */
  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<DashboardSummaryResponse> {
    try {
      // 1. Enforce organization boundary and permission check
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

      // 2. Filter keys based on the caller's scope (e.g., members only see their own assigned keys)
      const keys = await this.apiKeyRepository.findByOrgId(orgId)
      const visibleKeys = DashboardKeyScopeResolver.resolveVisibleKeys(keys, {
        callerUserId,
        callerSystemRole,
        orgMembershipRole: authResult.membership?.role,
      })

      const totalKeys = visibleKeys.length
      const activeKeys = visibleKeys.filter((k) => k.status === 'active').length

      // 3. Collect gateway identifiers for all active keys that are visible to the caller
      const virtualKeyIds = visibleKeys
        .filter((k) => k.status === 'active')
        .map((k) => k.gatewayKeyId)
        .filter((id) => id.length > 0)

      // 4. Aggregate metrics across the selected keys
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
