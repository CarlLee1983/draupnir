import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
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
import { DashboardController } from '../../Presentation/Controllers/DashboardController'
import { registerDashboardRoutes } from '../../Presentation/Routes/dashboard.routes'

export class DashboardServiceProvider extends ModuleServiceProvider implements IJobRegistrar, IRouteRegistrar {
  // 保留供 registerJobs() 使用（IJobRegistrar 介面需要）
  private container!: IContainer

  protected override registerRepositories(container: IContainer): void {
    this.container = container
    container.singleton('syncCursorRepository', (c: IContainer) =>
      new DrizzleSyncCursorRepository(c.make('database') as IDatabaseAccess)
    )
    container.singleton('drizzleUsageRepository', (c: IContainer) =>
      new DrizzleUsageRepository(c.make('database') as IDatabaseAccess)
    )
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('usageAggregator', (c: IContainer) => {
      if (getCurrentORM() === 'drizzle') {
        return new DatabaseUsageAggregator(c.make('drizzleUsageRepository') as IUsageRepository)
      }
      return new UsageAggregator(c.make('llmGatewayClient') as ILLMGatewayClient)
    })
    container.singleton('bifrostSyncService', (c: IContainer) => new BifrostSyncService(
      c.make('llmGatewayClient') as ILLMGatewayClient,
      c.make('drizzleUsageRepository') as IUsageRepository,
      c.make('syncCursorRepository') as ISyncCursorRepository,
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('database') as IDatabaseAccess,
    ))
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind('getDashboardSummaryService', (c: IContainer) => new GetDashboardSummaryService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('usageAggregator') as UsageAggregator,
    ))
    container.bind('getUsageChartService', (c: IContainer) => new GetUsageChartService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('usageAggregator') as UsageAggregator,
    ))
    container.bind('getKpiSummaryService', (c: IContainer) => new GetKpiSummaryService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('drizzleUsageRepository') as IUsageRepository,
      c.make('syncCursorRepository') as ISyncCursorRepository,
    ))
    container.bind('getCostTrendsService', (c: IContainer) => new GetCostTrendsService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('drizzleUsageRepository') as IUsageRepository,
    ))
    container.bind('getModelComparisonService', (c: IContainer) => new GetModelComparisonService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('drizzleUsageRepository') as IUsageRepository,
    ))
    container.bind('getPerKeyCostService', (c: IContainer) => new GetPerKeyCostService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('drizzleUsageRepository') as IUsageRepository,
    ))
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('dashboardController', (c: IContainer) => new DashboardController(
      c.make('getDashboardSummaryService') as GetDashboardSummaryService,
      c.make('getUsageChartService') as GetUsageChartService,
      c.make('getKpiSummaryService') as GetKpiSummaryService,
      c.make('getCostTrendsService') as GetCostTrendsService,
      c.make('getModelComparisonService') as GetModelComparisonService,
      c.make('getPerKeyCostService') as GetPerKeyCostService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('dashboardController') as DashboardController
    registerDashboardRoutes(context.router, controller)
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
        console.error(`[BifrostSync] Synced ${result.synced} records, quarantined ${result.quarantined}`)
      },
    )
  }
}
