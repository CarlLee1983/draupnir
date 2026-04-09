// src/Modules/AppModule/Application/DTOs/AppModuleDTO.ts
import type { ModuleTypeValue } from '../../Domain/ValueObjects/ModuleType'

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
