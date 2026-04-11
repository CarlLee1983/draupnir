// src/Modules/Contract/Application/DTOs/ContractDTO.ts
import type { ContractTargetType } from '../../Domain/ValueObjects/ContractTarget'
import type { ContractTermProps } from '../../Domain/Entities/ContractTerm'
import type { Contract } from '../../Domain/Aggregates/Contract'

/** Maps domain contracts into JSON-friendly records for HTTP responses. */
export class ContractPresenter {
  /** Serializes aggregate fields and ISO timestamps for APIs. */
  static fromEntity(entity: Contract): Record<string, unknown> {
    return {
      id: entity.id,
      targetType: entity.targetType,
      targetId: entity.targetId,
      status: entity.status,
      terms: entity.terms.toJSON(),
      createdBy: entity.createdBy,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }
}

/** Application-layer input for creating a contract (includes caller context). */
export interface CreateContractRequest {
  targetType: ContractTargetType
  targetId: string
  terms: ContractTermProps
  callerUserId: string
  callerSystemRole: string
}

/** Application-layer input for updating DRAFT contract terms. */
export interface UpdateContractRequest {
  contractId: string
  terms: ContractTermProps
  callerUserId: string
  callerSystemRole: string
}

/** Application-layer input for reassigning a DRAFT contract target. */
export interface AssignContractRequest {
  contractId: string
  targetType: ContractTargetType
  targetId: string
  callerUserId: string
  callerSystemRole: string
}

/** Standard command/query envelope returned by contract application services. */
export interface ContractResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

/** List-shaped variant of {@link ContractResponse}. */
export interface ContractListResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>[]
  error?: string
}
