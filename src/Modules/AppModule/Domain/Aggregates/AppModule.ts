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
 * Represents a registered functional capability or product unit available in the system.
 *
 * Responsibilities:
 * - Define unique identity and categorization for a system capability.
 * - Manage the lifecycle status of the module (e.g., active for new users, deprecated for sunsetting).
 * - Distinguish between billing models (free vs paid) to inform access control and subscription logic.
 */
export class AppModule {
  /** Internal state of the application module. */
  private readonly props: AppModuleProps

  /**
   * Internal constructor for the AppModule aggregate.
   * Use static factory methods like `create` or `fromDatabase` instead.
   *
   * @param props The initial properties for the aggregate.
   */
  private constructor(props: AppModuleProps) {
    this.props = props
  }

  /**
   * Creates a brand new application module instance.
   *
   * @param params Parameters including name, optional description, and module type.
   * @throws Error if the module name is empty or contains only whitespace.
   * @returns A new AppModule instance with 'active' status.
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

  /**
   * Reconstitutes an AppModule instance from a database record.
   *
   * @param row The raw database record.
   * @returns A reconstituted AppModule instance.
   */
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

  /**
   * Transitions the module to 'deprecated' status (immutable pattern).
   * Deprecated modules typically remain accessible to existing subscribers 
   * but prevent new subscriptions.
   *
   * @returns A new AppModule instance with 'deprecated' status.
   */
  deprecate(): AppModule {
    return new AppModule({
      ...this.props,
      status: 'deprecated',
    })
  }

  /** Gets the unique identifier of the module. */
  get id(): string {
    return this.props.id
  }

  /** Gets the internal canonical name (lowercase). */
  get name(): string {
    return this.props.name
  }

  /** Gets the human-readable description of the module's capabilities. */
  get description(): string {
    return this.props.description
  }

  /** Gets the string representation of the module type (e.g., 'free', 'paid'). */
  get type(): string {
    return this.props.type.toString()
  }

  /** Gets the current lifecycle status (active/deprecated). */
  get status(): string {
    return this.props.status
  }

  /** Gets the timestamp when the module was registered. */
  get createdAt(): Date {
    return this.props.createdAt
  }

  /**
   * Checks if the module is currently operational and available.
   * 
   * @returns True if status is 'active'.
   */
  isActive(): boolean {
    return this.props.status === 'active'
  }

  /**
   * Checks if the module is offered without any billing cost.
   * 
   * @returns True if the module type is free.
   */
  isFree(): boolean {
    return this.props.type.isFree()
  }

  /**
   * Checks if the module requires an active subscription or credit consumption.
   * 
   * @returns True if the module type is paid.
   */
  isPaid(): boolean {
    return this.props.type.isPaid()
  }
}
