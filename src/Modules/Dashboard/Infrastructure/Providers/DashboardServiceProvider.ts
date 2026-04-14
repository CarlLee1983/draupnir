import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { DashboardController } from '../../Presentation/Controllers/DashboardController'
import { registerDashboardRoutes } from '../../Presentation/Routes/dashboard.routes'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentORM } from '@/wiring/RepositoryFactory'
import appConfig from '../../../../../config/app'
import type { IJobRegistrar } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar'
import type { IScheduler } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import type { ISyncCursorRepository } from '../../Application/Ports/ISyncCursorRepository'
import type { IUsageRepository } from '../../Application/Ports/IUsageRepository'
import { GetCostTrendsService } from '../../Application/Services/GetCostTrendsService'
import { GetDashboardSummaryService } from '../../Application/Services/GetDashboardSummaryService'
import { GetKpiSummaryService } from '../../Application/Services/GetKpiSummaryService'
import { GetModelComparisonService } from '../../Application/Services/GetModelComparisonService'
import { GetPerKeyCostService } from '../../Application/Services/GetPerKeyCostService'
import { GetUsageChartService } from '../../Application/Services/GetUsageChartService'
import { DrizzleSyncCursorRepository } from '../Repositories/DrizzleSyncCursorRepository'
import { DrizzleUsageRepository } from '../Repositories/DrizzleUsageRepository'
import { BifrostSyncService } from '../Services/BifrostSyncService'
import { DatabaseUsageAggregator } from '../Services/DatabaseUsageAggregator'
import { UsageAggregator } from '../Services/UsageAggregator'

export class DashboardServiceProvider extends ModuleServiceProvider implements IJobRegistrar, IRouteRegistrar {
  private container!: IContainer

  override register(container: IContainer): void {
    this.container = container
    container.singleton('usageAggregator', (c: IContainer) => {
      const orm = getCurrentORM()
      if (orm === 'drizzle') {
        return new DatabaseUsageAggregator(c.make('drizzleUsageRepository') as IUsageRepository)
      }
      return new UsageAggregator(c.make('llmGatewayClient') as ILLMGatewayClient)
    })

    container.singleton('syncCursorRepository', (c: IContainer) => {
      return new DrizzleSyncCursorRepository(c.make('database') as IDatabaseAccess)
    })

    container.singleton('drizzleUsageRepository', (c: IContainer) => {
      return new DrizzleUsageRepository(c.make('database') as IDatabaseAccess)
    })

    container.singleton('bifrostSyncService', (c: IContainer) => {
      return new BifrostSyncService(
        c.make('llmGatewayClient') as ILLMGatewayClient,
        c.make('drizzleUsageRepository') as IUsageRepository,
        c.make('syncCursorRepository') as ISyncCursorRepository,
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('database') as IDatabaseAccess,
      )
    })

    container.bind('getDashboardSummaryService', (c: IContainer) => {
      return new GetDashboardSummaryService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('usageAggregator') as UsageAggregator,
      )
    })

    container.bind('getUsageChartService', (c: IContainer) => {
      return new GetUsageChartService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('usageAggregator') as UsageAggregator,
      )
    })

    container.bind('getKpiSummaryService', (c: IContainer) => {
      return new GetKpiSummaryService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('drizzleUsageRepository') as IUsageRepository,
        c.make('syncCursorRepository') as ISyncCursorRepository,
      )
    })

    container.bind('getCostTrendsService', (c: IContainer) => {
      return new GetCostTrendsService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('drizzleUsageRepository') as IUsageRepository,
      )
    })

    container.bind('getModelComparisonService', (c: IContainer) => {
      return new GetModelComparisonService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('drizzleUsageRepository') as IUsageRepository,
      )
    })

    container.bind('getPerKeyCostService', (c: IContainer) => {
      return new GetPerKeyCostService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('drizzleUsageRepository') as IUsageRepository,
      )
    })
  }

  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new DashboardController(
      core.container.make('getDashboardSummaryService') as any,
      core.container.make('getUsageChartService') as any,
      core.container.make('getKpiSummaryService') as any,
      core.container.make('getCostTrendsService') as any,
      core.container.make('getModelComparisonService') as any,
      core.container.make('getPerKeyCostService') as any,
    )
    registerDashboardRoutes(router, controller)
  }

  registerJobs(scheduler: IScheduler): void {
    const syncService = this.container.make('bifrostSyncService') as BifrostSyncService
    scheduler.schedule(
      {
        name: 'bifrost-sync',
        cron: appConfig.bifrostSyncCron,
        runOnInit: true,
        maxRetries: 2,
        backoffMs: 2000,
      },
      async () => {
        const result = await syncService.sync()
        console.error(
          `[BifrostSync] Synced ${result.synced} records, quarantined ${result.quarantined}`,
        )
      },
    )
  }
}
