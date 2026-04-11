import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { HealthController } from '../Controllers/HealthController'

export function registerHealthRoutes(router: IModuleRouter, controller: HealthController): void {
  router.get('/health', (ctx) => controller.check(ctx), { name: 'health.check' })

  router.get('/health/history', (ctx) => controller.history(ctx), { name: 'health.history' })
}
