import type { PlanetCore } from '@gravito/core'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/IMailer'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { IUsageRepository } from '@/Modules/Dashboard/Application/Ports/IUsageRepository'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { GetBudgetService } from '../../Application/Services/GetBudgetService'
import { EvaluateThresholdsService } from '../../Application/Services/EvaluateThresholdsService'
import { SendAlertService } from '../../Application/Services/SendAlertService'
import { SetBudgetService } from '../../Application/Services/SetBudgetService'
import type { IAlertConfigRepository } from '../../Domain/Repositories/IAlertConfigRepository'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'
import { DrizzleAlertConfigRepository } from '../Repositories/DrizzleAlertConfigRepository'
import { DrizzleAlertEventRepository } from '../Repositories/DrizzleAlertEventRepository'

export class AlertsServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = container.make('database') as IDatabaseAccess

    container.singleton('drizzleAlertConfigRepository', () => {
      return new DrizzleAlertConfigRepository(db)
    })

    container.singleton('drizzleAlertEventRepository', () => {
      return new DrizzleAlertEventRepository(db)
    })

    container.bind('setBudgetService', (c: IContainer) => {
      return new SetBudgetService(c.make('drizzleAlertConfigRepository') as IAlertConfigRepository)
    })

    container.bind('getBudgetService', (c: IContainer) => {
      return new GetBudgetService(c.make('drizzleAlertConfigRepository') as IAlertConfigRepository)
    })

    container.bind('sendAlertService', (c: IContainer) => {
      return new SendAlertService(
        c.make('mailer') as IMailer,
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
        c.make('organizationRepository') as IOrganizationRepository,
        c.make('authRepository') as IAuthRepository,
        c.make('drizzleAlertEventRepository') as IAlertEventRepository,
      )
    })

    container.bind('evaluateThresholdsService', (c: IContainer) => {
      return new EvaluateThresholdsService(
        c.make('drizzleAlertConfigRepository') as IAlertConfigRepository,
        c.make('drizzleUsageRepository') as IUsageRepository,
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('sendAlertService') as SendAlertService,
      )
    })
  }

  override boot(context: unknown): void {
    const core = context as PlanetCore
    const evaluateThresholdsService = core.container.make('evaluateThresholdsService') as EvaluateThresholdsService

    DomainEventDispatcher.getInstance().on('bifrost.sync.completed', async (event) => {
      const orgIds = Array.isArray(event.data.orgIds)
        ? event.data.orgIds.map((value) => String(value))
        : []
      await evaluateThresholdsService.evaluateOrgs(orgIds)
    })

    console.error('[Alerts] Module loaded')
  }
}
