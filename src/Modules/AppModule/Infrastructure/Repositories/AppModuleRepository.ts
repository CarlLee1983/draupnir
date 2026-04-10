// src/Modules/AppModule/Infrastructure/Repositories/AppModuleRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import { AppModule } from '../../Domain/Aggregates/AppModule'
import { AppModuleMapper } from '../Mappers/AppModuleMapper'

export class AppModuleRepository implements IAppModuleRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<AppModule | null> {
    const row = await this.db.table('app_modules').where('id', '=', id).first()
    return row ? AppModule.fromDatabase(row) : null
  }

  async findByName(name: string): Promise<AppModule | null> {
    const row = await this.db.table('app_modules').where('name', '=', name).first()
    return row ? AppModule.fromDatabase(row) : null
  }

  async findAll(): Promise<AppModule[]> {
    const rows = await this.db.table('app_modules').select()
    return rows.map((row) => AppModule.fromDatabase(row))
  }

  async save(module: AppModule): Promise<void> {
    await this.db.table('app_modules').insert(AppModuleMapper.toDatabaseRow(module))
  }

  async update(module: AppModule): Promise<void> {
    await this.db.table('app_modules').where('id', '=', module.id).update(AppModuleMapper.toDatabaseRow(module))
  }
}
