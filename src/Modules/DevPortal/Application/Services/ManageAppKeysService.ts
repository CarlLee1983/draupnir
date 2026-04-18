import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IApplicationRepository } from '../../Domain/Repositories/IApplicationRepository'
import type { ManageAppKeysRequest, ManageAppKeysResponse } from '../DTOs/WebhookConfigDTO'

export interface IIssueAppKeyService {
  execute(request: {
    orgId: string
    issuedByUserId: string
    callerSystemRole: string
    label: string
    scope?: string
    boundModuleIds?: string[]
  }): Promise<{
    success: boolean
    message: string
    data?: Record<string, unknown>
    error?: string
  }>
}

export interface IRevokeAppKeyService {
  execute(request: {
    keyId: string
    callerUserId: string
    callerSystemRole: string
  }): Promise<{ success: boolean; message: string; error?: string }>
}

export interface IListAppKeysService {
  execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
    page?: number,
    limit?: number,
  ): Promise<{
    success: boolean
    message?: string
    data?: Record<string, unknown>
    error?: string
  }>
}

export class ManageAppKeysService {
  constructor(
    private readonly applicationRepository: IApplicationRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly issueAppKeyService: IIssueAppKeyService,
    private readonly revokeAppKeyService: IRevokeAppKeyService,
    private readonly listAppKeysService: IListAppKeysService,
  ) {}

  async execute(request: ManageAppKeysRequest): Promise<ManageAppKeysResponse> {
    try {
      const application = await this.applicationRepository.findById(request.applicationId)
      if (!application) {
        return { success: false, message: 'Application not found', error: 'APP_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        application.orgId,
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

      switch (request.action) {
        case 'issue': {
          // 縱深防禦：底層 IssueAppKeyService 也會跑 requireOrgManager，
          // 這層刻意重複以阻止底層 service 被替換或直接呼叫時的授權繞過。
          const managerAuth = await this.orgAuth.requireOrgManager(
            application.orgId,
            request.callerUserId,
            request.callerSystemRole,
          )
          if (!managerAuth.authorized) {
            return {
              success: false,
              message: 'You are not authorized to issue App Keys for this application',
              error: managerAuth.error ?? 'NOT_ORG_MANAGER',
            }
          }
          const issueResult = await this.issueAppKeyService.execute({
            orgId: application.orgId,
            issuedByUserId: request.callerUserId,
            callerSystemRole: request.callerSystemRole,
            label: request.label ?? 'Unnamed Key',
            scope: request.scope,
            boundModuleIds: request.boundModules,
          })
          return {
            success: issueResult.success,
            message: issueResult.message,
            error: issueResult.error,
            data: issueResult.data,
          }
        }
        case 'revoke': {
          if (!request.keyId) {
            return { success: false, message: 'Missing keyId', error: 'KEY_ID_REQUIRED' }
          }
          // 縱深防禦：底層 RevokeAppKeyService 也會跑 requireOrgManager，
          // 這層刻意重複以阻止底層 service 被替換或直接呼叫時的授權繞過。
          const managerAuth = await this.orgAuth.requireOrgManager(
            application.orgId,
            request.callerUserId,
            request.callerSystemRole,
          )
          if (!managerAuth.authorized) {
            return {
              success: false,
              message: 'You are not authorized to revoke App Keys for this application',
              error: managerAuth.error ?? 'NOT_ORG_MANAGER',
            }
          }
          const revokeResult = await this.revokeAppKeyService.execute({
            keyId: request.keyId,
            callerUserId: request.callerUserId,
            callerSystemRole: request.callerSystemRole,
          })
          return {
            success: revokeResult.success,
            message: revokeResult.message,
            error: revokeResult.error,
          }
        }
        case 'list': {
          const listResult = await this.listAppKeysService.execute(
            application.orgId,
            request.callerUserId,
            request.callerSystemRole,
          )
          return {
            success: listResult.success,
            message: listResult.message ?? 'App keys retrieved successfully',
            data: listResult.data,
            error: listResult.error,
          }
        }
        default:
          return { success: false, message: 'Invalid action', error: 'INVALID_ACTION' }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Operation failed'
      return { success: false, message, error: message }
    }
  }
}
