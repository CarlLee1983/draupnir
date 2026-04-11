// src/Modules/Contract/Domain/Aggregates/Contract.ts
import { ContractStatus } from '../ValueObjects/ContractStatus'
import { ContractTarget, type ContractTargetType } from '../ValueObjects/ContractTarget'
import { ContractTerm, type ContractTermProps } from '../Entities/ContractTerm'

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
 * Contract aggregate root: target, terms, and status change only through methods that return new instances.
 */
export class Contract {
  private readonly props: ContractProps

  private constructor(props: ContractProps) {
    this.props = props
  }

  /** Creates a new DRAFT contract; assigns a random id when `id` is omitted. */
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

  /** Rehydrates an aggregate from a persistence row (parses JSON `terms` when string). */
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

  /** Returns a copy transitioned to ACTIVE when the current status allows it. */
  activate(): Contract {
    const newStatus = this.props.status.transitionTo(ContractStatus.active())
    return new Contract({
      ...this.props,
      status: newStatus,
      updatedAt: new Date(),
    })
  }

  /** Returns a copy transitioned to EXPIRED when the current status allows it. */
  expire(): Contract {
    const newStatus = this.props.status.transitionTo(ContractStatus.expired())
    return new Contract({
      ...this.props,
      status: newStatus,
      updatedAt: new Date(),
    })
  }

  /** Returns a copy transitioned to TERMINATED when the current status allows it. */
  terminate(): Contract {
    const newStatus = this.props.status.transitionTo(ContractStatus.terminated())
    return new Contract({
      ...this.props,
      status: newStatus,
      updatedAt: new Date(),
    })
  }

  /** Returns a copy with replaced terms; only allowed while the contract is DRAFT. */
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

  /** Returns a copy bound to a new target; only allowed while the contract is DRAFT. */
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

  /** True when the terms allow the given module name. */
  hasModule(moduleName: string): boolean {
    return this.props.terms.hasModule(moduleName)
  }

  get id(): string {
    return this.props.id
  }
  get targetType(): ContractTargetType {
    return this.props.target.getType()
  }
  get targetId(): string {
    return this.props.target.getId()
  }
  get status(): string {
    return this.props.status.toString()
  }
  get terms(): ContractTerm {
    return this.props.terms
  }
  get createdBy(): string {
    return this.props.createdBy
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  /** True when lifecycle status is ACTIVE. */
  isActive(): boolean {
    return this.props.status.isActive()
  }

  /** True when lifecycle status is DRAFT. */
  isDraft(): boolean {
    return this.props.status.isDraft()
  }

}
