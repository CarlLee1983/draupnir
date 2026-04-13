// src/Modules/Credit/Application/Services/GetBalanceService.ts
/**
 * GetBalanceService
 * Application service: retrieves the current credit status for an organization.
 *
 * Responsibilities:
 * - Verify caller's membership in the organization
 * - Retrieve credit account summary (balance, status, threshold)
 * - Provide sensible defaults for organizations without an established account
 */

import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { BalanceResponse } from '../DTOs/CreditDTO'

/**
 * Service for checking organization credit balance.
 */
export class GetBalanceService {
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  /**
   * Executes the balance retrieval.
   * @param orgId - Organization ID to check.
   * @param callerUserId - ID of the user requesting the balance.
   * @param callerSystemRole - System role of the requester.
   */
  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<BalanceResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        orgId,
        callerUserId,
        callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'Unauthorized access to this organization',
          error: 'NOT_ORG_MEMBER',
        }
      }

      const account = await this.accountRepo.findByOrgId(orgId)
      if (!account) {
        return {
          success: true,
          message: 'Success',
          data: { balance: '0', lowBalanceThreshold: '100', status: 'active' },
        }
      }

      return {
        success: true,
        message: 'Success',
        data: {
          balance: account.balance,
          lowBalanceThreshold: account.lowBalanceThreshold,
          status: account.status,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Retrieval failed'
      return { success: false, message, error: message }
    }
  }
}
