// src/Modules/AppModule/Application/Services/EnsureCoreAppModulesService.ts
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import { AppModule } from '../../Domain/Aggregates/AppModule'
import { CORE_APP_MODULE_SPECS } from '../../Domain/CoreAppModules'

export class EnsureCoreAppModulesService {
	constructor(private readonly moduleRepo: IAppModuleRepository) {}

	async execute(): Promise<void> {
		for (const spec of CORE_APP_MODULE_SPECS) {
			const existing = await this.moduleRepo.findByName(spec.name)
			if (existing) continue
			const mod = AppModule.create({
				id: spec.id,
				name: spec.name,
				description: spec.description,
				type: 'free',
			})
			await this.moduleRepo.save(mod)
		}
	}
}
