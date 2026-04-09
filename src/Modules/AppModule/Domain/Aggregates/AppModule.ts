// src/Modules/AppModule/Domain/Aggregates/AppModule.ts
import { ModuleType, type ModuleTypeValue } from '../ValueObjects/ModuleType'

interface AppModuleProps {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly type: ModuleType
  readonly status: 'active' | 'deprecated'
  readonly createdAt: Date
}

export class AppModule {
  private readonly props: AppModuleProps

  private constructor(props: AppModuleProps) {
    this.props = props
  }

  static create(params: {
    id?: string
    name: string
    description?: string
    type: ModuleTypeValue
  }): AppModule {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('模組名稱不可為空')
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

  deprecate(): AppModule {
    return new AppModule({
      ...this.props,
      status: 'deprecated',
    })
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get description(): string { return this.props.description }
  get type(): string { return this.props.type.toString() }
  get status(): string { return this.props.status }
  get createdAt(): Date { return this.props.createdAt }

  isActive(): boolean { return this.props.status === 'active' }
  isFree(): boolean { return this.props.type.isFree() }
  isPaid(): boolean { return this.props.type.isPaid() }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      name: this.props.name,
      description: this.props.description,
      type: this.props.type.toString(),
      status: this.props.status,
      created_at: this.props.createdAt.toISOString(),
    }
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.props.id,
      name: this.props.name,
      description: this.props.description,
      type: this.props.type.toString(),
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
    }
  }
}
