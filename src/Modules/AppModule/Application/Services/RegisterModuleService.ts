// src/Modules/AppModule/Application/Services/RegisterModuleService.ts
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import { AppModule } from '../../Domain/Aggregates/AppModule'
import type { RegisterModuleRequest, ModuleResponse } from '../DTOs/AppModuleDTO'

export class RegisterModuleService {
  constructor(private readonly moduleRepo: IAppModuleRepository) {}

  async execute(request: RegisterModuleRequest): Promise<ModuleResponse> {
    try {
      if (request.callerRole !== 'admin') {
        return { success: false, message: '僅管理者可註冊模組', error: 'FORBIDDEN' }
      }

      const existing = await this.moduleRepo.findByName(request.name.trim().toLowerCase())
      if (existing) {
        return { success: false, message: '模組名稱已存在', error: 'DUPLICATE_NAME' }
      }

      const module = AppModule.create({
        name: request.name,
        description: request.description,
        type: request.type,
      })

      await this.moduleRepo.save(module)

      return {
        success: true,
        message: '模組註冊成功',
        data: module.toDTO(),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '註冊模組失敗'
      return { success: false, message, error: message }
    }
  }
}
