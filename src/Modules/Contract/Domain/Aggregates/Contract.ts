// src/Modules/Contract/Domain/Aggregates/Contract.ts

import { ContractTerm, type ContractTermProps } from '../Entities/ContractTerm'
import { ContractStatus } from '../ValueObjects/ContractStatus'
import { ContractTarget, type ContractTargetType } from '../ValueObjects/ContractTarget'

/** Immutable snapshot backing the contract aggregate. */
interface ContractProps {
  readonly id: string
  readonly target: ContractTarget
  readonly status: ContractStatus
  readonly terms: ContractTerm
  readonly createdBy: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Contract Aggregate Root
 * Represents a formal agreement defining access levels and resource quotas.
 *
 * Responsibilities:
 * - Define the target entity (organization/user) and the terms of the agreement.
 * - Manage a strict state machine lifecycle (DRAFT -> ACTIVE -> EXPIRED/TERMINATED).
 * - Enforce rules for term modification (e.g., only allowed in DRAFT).
 * - Support administrative overrides like quota adjustments for active contracts.
 */
export class Contract {
  /** Internal state of the contract aggregate. */
  private readonly props: ContractProps

  /**
   * Internal constructor for the Contract aggregate.
   * Use static factory methods like `create` or `fromDatabase` instead.
   *
   * @param props The initial properties for the aggregate.
   */
  private constructor(props: ContractProps) {
    this.props = props
  }

  /**
   * Creates a brand new contract in DRAFT status.
   *
   * @param params Parameters including target entity info, initial terms, and creator.
   * @returns A new Contract instance.
   */
  static create(params: {
    id?: string
    targetType: ContractTargetType
    targetId: string
    terms: ContractTermProps
    createdBy: string
  }): Contract {
    return new Contract({
      id: params.id ?? crypto.randomUUID(),
      target: ContractTarget.create(params.targetType, params.targetId),
      status: ContractStatus.draft(),
      terms: ContractTerm.create(params.terms),
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * Reconstitutes a Contract instance from a database record.
   *
   * @param row The raw database record.
   * @returns A reconstituted Contract instance.
   */
  static fromDatabase(row: Record<string, unknown>): Contract {
    const termsData = typeof row.terms === 'string' ? JSON.parse(row.terms) : row.terms
    return new Contract({
      id: row.id as string,
      target: ContractTarget.create(row.target_type as string, row.target_id as string),
      status: ContractStatus.fromString(row.status as string),
      terms: ContractTerm.fromJSON(termsData),
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  /**
   * Transitions the contract to ACTIVE status (immutable pattern).
   *
   * @throws Error if the status transition is invalid.
   * @returns A new Contract instance with ACTIVE status.
   */
  activate(): Contract {
    const newStatus = this.props.status.transitionTo(ContractStatus.active())
    return new Contract({
      ...this.props,
      status: newStatus,
      updatedAt: new Date(),
    })
  }

  /**
   * Transitions the contract to EXPIRED status (immutable pattern).
   *
   * @throws Error if the status transition is invalid.
   * @returns A new Contract instance with EXPIRED status.
   */
  expire(): Contract {
    const newStatus = this.props.status.transitionTo(ContractStatus.expired())
    return new Contract({
      ...this.props,
      status: newStatus,
      updatedAt: new Date(),
    })
  }

  /**
   * Transitions the contract to TERMINATED status (immutable pattern).
   *
   * @throws Error if the status transition is invalid.
   * @returns A new Contract instance with TERMINATED status.
   */
  terminate(): Contract {
    const newStatus = this.props.status.transitionTo(ContractStatus.terminated())
    return new Contract({
      ...this.props,
      status: newStatus,
      updatedAt: new Date(),
    })
  }

  /**
   * Adjusts the credit quota for an existing contract (immutable pattern).
   * Unlike full term updates, this is allowed on both DRAFT and ACTIVE contracts 
   * to support administrative overrides.
   *
   * @param newCreditQuota The new numeric quota value.
   * @throws Error if the quota is negative.
   * @returns A new Contract instance with the updated quota.
   */
  adjustCreditQuota(newCreditQuota: number): Contract {
    if (newCreditQuota < 0) {
      throw new Error('Credit quota cannot be negative')
    }
    const newTerms = this.props.terms.toJSON()
    return new Contract({
      ...this.props,
      terms: ContractTerm.create({ ...newTerms, creditQuota: newCreditQuota }),
      updatedAt: new Date(),
    })
  }

  /**
   * Replaces all terms for a contract (immutable pattern).
   * Only allowed while the contract is still in DRAFT status.
   *
   * @param terms The new full set of terms.
   * @throws Error if the contract is not in DRAFT status.
   * @returns A new Contract instance with the updated terms.
   */
  updateTerms(terms: ContractTermProps): Contract {
    if (!this.props.status.isDraft()) {
      throw new Error('Only DRAFT contracts can have their terms modified')
    }
    return new Contract({
      ...this.props,
      terms: ContractTerm.create(terms),
      updatedAt: new Date(),
    })
  }

  /**
   * Reassigns the contract to a different target entity (immutable pattern).
   * Only allowed while the contract is still in DRAFT status.
   *
   * @param targetType The new target category (e.g., 'organization').
   * @param targetId The ID of the new target entity.
   * @throws Error if the contract is not in DRAFT status.
   * @returns A new Contract instance with the updated target.
   */
  assignTo(targetType: ContractTargetType, targetId: string): Contract {
    if (!this.props.status.isDraft()) {
      throw new Error('Only DRAFT contracts can be reassigned')
    }
    return new Contract({
      ...this.props,
      target: ContractTarget.create(targetType, targetId),
      updatedAt: new Date(),
    })
  }

  /**
   * Checks if the current terms allow access to a specific system module.
   *
   * @param moduleName The name of the module to check.
   * @returns True if the module is authorized.
   */
  hasModule(moduleName: string): boolean {
    return this.props.terms.hasModule(moduleName)
  }

  /** Gets the unique identifier of the contract. */
  get id(): string {
    return this.props.id
  }

  /** Gets the type of the target entity (organization/user). */
  get targetType(): ContractTargetType {
    return this.props.target.getType()
  }

  /** Gets the ID of the target entity. */
  get targetId(): string {
    return this.props.target.getId()
  }

  /** Gets the string representation of the contract status. */
  get status(): string {
    return this.props.status.toString()
  }

  /** Gets the full terms entity associated with the contract. */
  get terms(): ContractTerm {
    return this.props.terms
  }

  /** Gets the ID of the user who created the contract. */
  get createdBy(): string {
    return this.props.createdBy
  }

  /** Gets the timestamp when the contract was created. */
  get createdAt(): Date {
    return this.props.createdAt
  }

  /** Gets the timestamp when the contract was last updated. */
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  /**
   * Checks if the contract is currently ACTIVE.
   * 
   * @returns True if active.
   */
  isActive(): boolean {
    return this.props.status.isActive()
  }

  /**
   * Checks if the contract is still in DRAFT status.
   * 
   * @returns True if draft.
   */
  isDraft(): boolean {
    return this.props.status.isDraft()
  }
}
