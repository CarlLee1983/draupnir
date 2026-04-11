// src/Modules/Contract/Domain/Aggregates/Contract.ts
import { ContractStatus } from '../ValueObjects/ContractStatus'
import { ContractTarget, type ContractTargetType } from '../ValueObjects/ContractTarget'
import { ContractTerm, type ContractTermProps } from '../Entities/ContractTerm'

interface ContractProps {
  readonly id: string
  readonly target: ContractTarget
  readonly status: ContractStatus
  readonly terms: ContractTerm
  readonly createdBy: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

export class Contract {
  private readonly props: ContractProps

  private constructor(props: ContractProps) {
    this.props = props
  }

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

  activate(): Contract {
    const newStatus = this.props.status.transitionTo(ContractStatus.active())
    return new Contract({
      ...this.props,
      status: newStatus,
      updatedAt: new Date(),
    })
  }

  expire(): Contract {
    const newStatus = this.props.status.transitionTo(ContractStatus.expired())
    return new Contract({
      ...this.props,
      status: newStatus,
      updatedAt: new Date(),
    })
  }

  terminate(): Contract {
    const newStatus = this.props.status.transitionTo(ContractStatus.terminated())
    return new Contract({
      ...this.props,
      status: newStatus,
      updatedAt: new Date(),
    })
  }

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

  isActive(): boolean {
    return this.props.status.isActive()
  }
  isDraft(): boolean {
    return this.props.status.isDraft()
  }

}
