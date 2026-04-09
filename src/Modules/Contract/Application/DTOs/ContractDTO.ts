// src/Modules/Contract/Application/DTOs/ContractDTO.ts
import type { ContractTargetType } from '../../Domain/ValueObjects/ContractTarget'
import type { ContractTermProps } from '../../Domain/Entities/ContractTerm'

export interface CreateContractRequest {
  targetType: ContractTargetType
  targetId: string
  terms: ContractTermProps
  callerUserId: string
  callerSystemRole: string
}

export interface UpdateContractRequest {
  contractId: string
  terms: ContractTermProps
  callerUserId: string
  callerSystemRole: string
}

export interface AssignContractRequest {
  contractId: string
  targetType: ContractTargetType
  targetId: string
  callerUserId: string
  callerSystemRole: string
}

export interface ContractResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

export interface ContractListResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>[]
  error?: string
}
