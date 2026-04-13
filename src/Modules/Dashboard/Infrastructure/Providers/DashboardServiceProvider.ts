import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IUsageRepository } from '../../Application/Ports/IUsageRepository'
import type { ISyncCursorRepository } from '../../Application/Ports/ISyncCursorRepository'
import { GetCostTrendsService } from '../../Application/Services/GetCostTrendsService'
import { GetKpiSummaryService } from '../../Application/Services/GetKpiSummaryService'
import { GetModelComparisonService } from '../../Application/Services/GetModelComparisonService'
import { GetPerKeyCostService } from '../../Application/Services/GetPerKeyCostService'
import { DrizzleSyncCursorRepository } from '../Repositories/DrizzleSyncCursorRepository'
import { DrizzleUsageRepository } from '../Repositories/DrizzleUsageRepository'
import { BifrostSyncService } from '../Services/BifrostSyncService'
import { UsageAggregator } from '../Services/UsageAggregator'
import { DatabaseUsageAggregator } from '../Services/DatabaseUsageAggregator'
import { GetDashboardSummaryService } from '../../Application/Services/GetDashboardSummaryService'
import { GetUsageChartService } from '../../Application/Services/GetUsageChartService'
import type { IJobRegistrar } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar'
import type { IScheduler } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import appConfig from '../../../../../config/app'
import { getCurrentORM } from '@/wiring/RepositoryFactory'

export class DashboardServiceProvider extends ModuleServiceProvider implements IJobRegistrar {
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
