import type { IApplicationRepository } from '../../Domain/Repositories/IApplicationRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { ApplicationPresenter, type ListAppsRequest } from '../DTOs/RegisterAppDTO'

export interface ListAppsResponse {
  success: boolean
  message: string
  error?: string
  data?: {
    apps: Record<string, unknown>[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }
}

export class ListAppsService {
  constructor(
    private readonly applicationRepository: IApplicationRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(request: ListAppsRequest): Promise<ListAppsResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        request.orgId,
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

      const page = request.page ?? 1
      const limit = request.limit ?? 20
      const offset = (page - 1) * limit

      const [apps, total] = await Promise.all([
        this.applicationRepository.findByOrgId(request.orgId, limit, offset),
        this.applicationRepository.countByOrgId(request.orgId),
      ])

      return {
        success: true,
        message: 'Query successful',
        data: {
          apps: apps.map((a) => ApplicationPresenter.fromEntity(a)),
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}
