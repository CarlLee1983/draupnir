// src/Modules/AppModule/Domain/Repositories/IAppModuleRepository.ts
import type { AppModule } from '../Aggregates/AppModule'

export interface IAppModuleRepository {
  findById(id: string): Promise<AppModule | null>
  findByName(name: string): Promise<AppModule | null>
  findAll(): Promise<AppModule[]>
  save(module: AppModule): Promise<void>
  update(module: AppModule): Promise<void>
}
