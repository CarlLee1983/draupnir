import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { Application } from '../../Domain/Aggregates/Application'
import type { IApplicationRepository } from '../../Domain/Repositories/IApplicationRepository'
import {
  ApplicationPresenter,
  type RegisterAppRequest,
  type RegisterAppResponse,
} from '../DTOs/RegisterAppDTO'

export class RegisterAppService {
  constructor(
    private readonly applicationRepository: IApplicationRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(request: RegisterAppRequest): Promise<RegisterAppResponse> {
    try {
      if (!request.name?.trim()) {
        return { success: false, message: 'Application name is required', error: 'NAME_REQUIRED' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        request.orgId,
        request.createdByUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'You are not a member of this organization',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const appId = crypto.randomUUID()
      const application = Application.create({
        id: appId,
        name: request.name,
        description: request.description ?? '',
        orgId: request.orgId,
        createdByUserId: request.createdByUserId,
        redirectUris: request.redirectUris,
      })

      await this.applicationRepository.save(application)

      return {
        success: true,
        message: 'Application registered successfully',
        data: ApplicationPresenter.fromEntity(application),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      return { success: false, message, error: message }
    }
  }
}
