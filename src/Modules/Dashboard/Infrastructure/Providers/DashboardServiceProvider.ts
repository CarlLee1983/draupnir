import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { UsageAggregator } from '../Services/UsageAggregator'
import { GetDashboardSummaryService } from '../../Application/Services/GetDashboardSummaryService'
import { GetUsageChartService } from '../../Application/Services/GetUsageChartService'

export class DashboardServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('usageAggregator', (c: IContainer) => {
      return new UsageAggregator(c.make('llmGatewayClient') as ILLMGatewayClient)
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
  }

  override boot(_context: unknown): void {
    console.log('📊 [Dashboard] Module loaded')
  }
}
