// src/Modules/AppModule/Application/DTOs/AppModuleDTO.ts

import type { AppModule } from '../../Domain/Aggregates/AppModule'
import type { ModuleSubscription } from '../../Domain/Entities/ModuleSubscription'
import type { ModuleTypeValue } from '../../Domain/ValueObjects/ModuleType'

export const AppModulePresenter = {
  fromEntity(entity: AppModule): Record<string, unknown> {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      type: entity.type,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
    }
  },
}

export const ModuleSubscriptionPresenter = {
  fromEntity(entity: ModuleSubscription): Record<string, unknown> {
    return {
      id: entity.id,
      orgId: entity.orgId,
      moduleId: entity.moduleId,
      status: entity.status,
      subscribedAt: entity.subscribedAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  },
}

export interface RegisterModuleRequest {
  name: string
  description?: string
  type: ModuleTypeValue
  callerRole: string
}

export interface SubscribeModuleRequest {
  orgId: string
  moduleId: string
  callerUserId: string
  callerRole: string
}

export interface ModuleResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

export interface ModuleListResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>[]
  error?: string
}
