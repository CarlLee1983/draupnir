// src/Modules/AppModule/Application/Services/GetModuleDetailService.ts
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import { AppModulePresenter, type ModuleResponse } from '../DTOs/AppModuleDTO'

export class GetModuleDetailService {
  constructor(private readonly moduleRepo: IAppModuleRepository) {}

  async execute(moduleId: string): Promise<ModuleResponse> {
    try {
      const module = await this.moduleRepo.findById(moduleId)
      if (!module) {
        return { success: false, message: 'Module not found', error: 'NOT_FOUND' }
      }
      return {
        success: true,
        message: 'Query successful',
        data: AppModulePresenter.fromEntity(module),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
