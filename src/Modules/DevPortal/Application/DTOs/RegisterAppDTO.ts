import type { Application } from '../../Domain/Aggregates/Application'

export const ApplicationPresenter = {
  fromEntity(entity: Application): Record<string, unknown> {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      orgId: entity.orgId,
      createdByUserId: entity.createdByUserId,
      status: entity.status,
      webhookUrl: entity.webhookUrl,
      redirectUris: [...entity.redirectUris],
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  },
}

export interface RegisterAppRequest {
  orgId: string
  createdByUserId: string
  callerSystemRole: string
  name: string
  description?: string
  redirectUris?: string[]
}

export interface RegisterAppResponse {
  success: boolean
  message: string
  error?: string
  data?: Record<string, unknown>
}

export interface UpdateAppRequest {
  appId: string
  callerUserId: string
  callerSystemRole: string
  name?: string
  description?: string
  redirectUris?: string[]
}

export interface ListAppsRequest {
  orgId: string
  callerUserId: string
  callerSystemRole: string
  page?: number
  limit?: number
}
