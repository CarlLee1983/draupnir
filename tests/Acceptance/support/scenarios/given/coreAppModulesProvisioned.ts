import type { ScenarioRunner } from '../runner'

export function coreAppModulesProvisionedStep(builder: ScenarioRunner, orgId: string): ScenarioRunner {
  builder.__pushStep(async () => {
    const modules = await builder.app.seed.allCoreAppModules()
    await builder.app.seed.contract({
      targetId: orgId,
      createdBy: 'system',
      allowedModules: modules.map((module) => module.name),
    })
    for (const module of modules) {
      await builder.app.seed.moduleSubscription({ orgId, moduleId: module.id })
    }
  })
  return builder
}
