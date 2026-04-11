// src/Modules/AppModule/Application/Services/ListModulesService.ts
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import { AppModulePresenter, type ModuleListResponse } from '../DTOs/AppModuleDTO'

export class ListModulesService {
  constructor(private readonly moduleRepo: IAppModuleRepository) {}

  async execute(): Promise<ModuleListResponse> {
    try {
      const modules = await this.moduleRepo.findAll()
      return {
        success: true,
        message: 'Query successful',
        data: modules.map((m) => AppModulePresenter.fromEntity(m)),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
