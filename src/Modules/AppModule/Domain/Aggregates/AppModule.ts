// src/Modules/AppModule/Domain/Aggregates/AppModule.ts
/**
 * AppModule
 * Domain Aggregate: represents a functional capability or product unit within the system.
 *
 * Responsibilities:
 * - Define module identity and categorization
 * - Manage module lifecycle (active, deprecated)
 * - Determine billing nature (free vs paid)
 */

import { ModuleType, type ModuleTypeValue } from '../ValueObjects/ModuleType'

/** Properties defining an AppModule's state. */
interface AppModuleProps {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly type: ModuleType
  readonly status: 'active' | 'deprecated'
  readonly createdAt: Date
}

/**
 * AppModule Aggregate Root
 * Represents a registered capability available for organization subscription.
 */
export class AppModule {
  private readonly props: AppModuleProps

  private constructor(props: AppModuleProps) {
    this.props = props
  }

  /**
   * Creates a new application module.
   */
  static create(params: {
    id?: string
    name: string
    description?: string
    type: ModuleTypeValue
  }): AppModule {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Module name cannot be empty')
    }
    return new AppModule({
      id: params.id ?? crypto.randomUUID(),
      name: params.name.trim().toLowerCase(),
      description: params.description ?? '',
      type: ModuleType.fromString(params.type),
      status: 'active',
      createdAt: new Date(),
    })
  }

  /** Reconstitutes a module from a database record. */
  static fromDatabase(row: Record<string, unknown>): AppModule {
    return new AppModule({
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) ?? '',
      type: ModuleType.fromString(row.type as string),
      status: row.status as 'active' | 'deprecated',
      createdAt: new Date(row.created_at as string),
    })
  }

  /** Marks the module as deprecated, typically to prevent new subscriptions. */
  deprecate(): AppModule {
    return new AppModule({
      ...this.props,
      status: 'deprecated',
    })
  }

  /** Unique identifier. */
  get id(): string {
    return this.props.id
  }
  /** Internal canonical name. */
  get name(): string {
    return this.props.name
  }
  /** Human-readable description of capabilities. */
  get description(): string {
    return this.props.description
  }
  /** Module category (free, paid, etc). */
  get type(): string {
    return this.props.type.toString()
  }
  /** Current lifecycle status. */
  get status(): string {
    return this.props.status
  }
  /** Date of registration. */
  get createdAt(): Date {
    return this.props.createdAt
  }

  /** Returns true if the module is currently operational. */
  isActive(): boolean {
    return this.props.status === 'active'
  }
  /** Returns true if the module entails no billing cost. */
  isFree(): boolean {
    return this.props.type.isFree()
  }
  /** Returns true if the module requires an active subscription or credit. */
  isPaid(): boolean {
    return this.props.type.isPaid()
  }
}
