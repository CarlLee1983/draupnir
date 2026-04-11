// src/Modules/AppModule/Application/Services/RegisterModuleService.ts
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import { AppModule } from '../../Domain/Aggregates/AppModule'
import {
  AppModulePresenter,
  type RegisterModuleRequest,
  type ModuleResponse,
} from '../DTOs/AppModuleDTO'

export class RegisterModuleService {
  constructor(private readonly moduleRepo: IAppModuleRepository) {}

  async execute(request: RegisterModuleRequest): Promise<ModuleResponse> {
    try {
      if (request.callerRole !== 'admin') {
        return { success: false, message: 'Only admins can register modules', error: 'FORBIDDEN' }
      }

      const existing = await this.moduleRepo.findByName(request.name.trim().toLowerCase())
      if (existing) {
        return { success: false, message: 'Module name already exists', error: 'DUPLICATE_NAME' }
      }

      const module = AppModule.create({
        name: request.name,
        description: request.description,
        type: request.type,
      })

      await this.moduleRepo.save(module)

      return {
        success: true,
        message: 'Module registered successfully',
        data: AppModulePresenter.fromEntity(module),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to register module'
      return { success: false, message, error: message }
    }
  }
}
