import type { PlanetCore } from '@gravito/core'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/IMailer'
import type { IWebhookDispatcher } from '@/Foundation/Infrastructure/Ports/IWebhookDispatcher'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IUsageRepository } from '@/Modules/Dashboard/Application/Ports/IUsageRepository'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { DeleteWebhookEndpointService } from '../../Application/Services/DeleteWebhookEndpointService'
import { EvaluateThresholdsService } from '../../Application/Services/EvaluateThresholdsService'
import { GetAlertHistoryService } from '../../Application/Services/GetAlertHistoryService'
import { GetBudgetService } from '../../Application/Services/GetBudgetService'
import { ListWebhookEndpointsService } from '../../Application/Services/ListWebhookEndpointsService'
import { RegisterWebhookEndpointService } from '../../Application/Services/RegisterWebhookEndpointService'
import { ResendDeliveryService } from '../../Application/Services/ResendDeliveryService'
import { RotateWebhookSecretService } from '../../Application/Services/RotateWebhookSecretService'
import { SendAlertService } from '../../Application/Services/SendAlertService'
import { SetBudgetService } from '../../Application/Services/SetBudgetService'
import { TestWebhookEndpointService } from '../../Application/Services/TestWebhookEndpointService'
import { UpdateWebhookEndpointService } from '../../Application/Services/UpdateWebhookEndpointService'
import type { IAlertConfigRepository } from '../../Domain/Repositories/IAlertConfigRepository'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'
import type { IAlertNotifier } from '../../Domain/Services/IAlertNotifier'
import type { IAlertRecipientResolver } from '../../Domain/Services/IAlertRecipientResolver'
import { AlertController } from '../../Presentation/Controllers/AlertController'
import { AlertHistoryController } from '../../Presentation/Controllers/AlertHistoryController'
import { WebhookEndpointController } from '../../Presentation/Controllers/WebhookEndpointController'
import { AlertConfigRepository } from '../Repositories/AlertConfigRepository'
import { AlertDeliveryRepository } from '../Repositories/AlertDeliveryRepository'
import { AlertEventRepository } from '../Repositories/AlertEventRepository'
import { WebhookEndpointRepository } from '../Repositories/WebhookEndpointRepository'
import { AlertRecipientResolverImpl } from '../Services/AlertRecipientResolverImpl'
import { EmailAlertNotifier } from '../Services/EmailAlertNotifier'
import { WebhookAlertNotifier } from '../Services/WebhookAlertNotifier'

export class AlertsServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = container.make('database') as IDatabaseAccess

    container.singleton('alertConfigRepository', () => {
      return new AlertConfigRepository(db)
    })

    container.singleton('alertEventRepository', () => {
      return new AlertEventRepository(db)
    })

    container.singleton('webhookEndpointRepository', () => {
      return new WebhookEndpointRepository(db)
    })

    container.singleton('alertDeliveryRepository', () => {
      return new AlertDeliveryRepository(db)
    })

    container.bind('alertRecipientResolver', (c: IContainer) => {
      return new AlertRecipientResolverImpl({
        orgRepo: c.make('organizationRepository') as IOrganizationRepository,
        orgMemberRepo: c.make('organizationMemberRepository') as IOrganizationMemberRepository,
        authRepo: c.make('authRepository') as IAuthRepository,
      })
    })

    container.singleton('emailAlertNotifier', (c: IContainer) => {
      return new EmailAlertNotifier({
        mailer: c.make('mailer') as IMailer,
        deliveryRepo: c.make('alertDeliveryRepository') as IAlertDeliveryRepository,
      })
    })

    container.singleton('webhookAlertNotifier', (c: IContainer) => {
      return new WebhookAlertNotifier({
        endpointRepo: c.make('webhookEndpointRepository') as IWebhookEndpointRepository,
        deliveryRepo: c.make('alertDeliveryRepository') as IAlertDeliveryRepository,
        dispatcher: c.make('webhookDispatcher') as IWebhookDispatcher,
      })
    })

    container.bind('setBudgetService', (c: IContainer) => {
      return new SetBudgetService(c.make('alertConfigRepository') as IAlertConfigRepository)
    })

    container.bind('getBudgetService', (c: IContainer) => {
      return new GetBudgetService(c.make('alertConfigRepository') as IAlertConfigRepository)
    })

    container.bind('alertController', (c: IContainer) => {
      return new AlertController(
        c.make('setBudgetService') as SetBudgetService,
        c.make('getBudgetService') as GetBudgetService,
      )
    })

    container.bind('registerWebhookEndpointService', (c: IContainer) => {
      return new RegisterWebhookEndpointService({
        repo: c.make('webhookEndpointRepository') as IWebhookEndpointRepository,
        allowHttp: process.env.WEBHOOK_ALLOW_HTTP === '1',
      })
    })

    container.bind('listWebhookEndpointsService', (c: IContainer) => {
      return new ListWebhookEndpointsService(
        c.make('webhookEndpointRepository') as IWebhookEndpointRepository,
      )
    })

    container.bind('updateWebhookEndpointService', (c: IContainer) => {
      return new UpdateWebhookEndpointService(
        c.make('webhookEndpointRepository') as IWebhookEndpointRepository,
      )
    })

    container.bind('rotateWebhookSecretService', (c: IContainer) => {
      return new RotateWebhookSecretService(
        c.make('webhookEndpointRepository') as IWebhookEndpointRepository,
      )
    })

    container.bind('deleteWebhookEndpointService', (c: IContainer) => {
      return new DeleteWebhookEndpointService(
        c.make('webhookEndpointRepository') as IWebhookEndpointRepository,
      )
    })

    container.bind('testWebhookEndpointService', (c: IContainer) => {
      return new TestWebhookEndpointService({
        repo: c.make('webhookEndpointRepository') as IWebhookEndpointRepository,
        dispatcher: c.make('webhookDispatcher') as IWebhookDispatcher,
      })
    })

    container.bind('webhookEndpointController', (c: IContainer) => {
      return new WebhookEndpointController({
        listWebhookEndpointsService: c.make(
          'listWebhookEndpointsService',
        ) as ListWebhookEndpointsService,
        registerWebhookEndpointService: c.make(
          'registerWebhookEndpointService',
        ) as RegisterWebhookEndpointService,
        updateWebhookEndpointService: c.make(
          'updateWebhookEndpointService',
        ) as UpdateWebhookEndpointService,
        rotateWebhookSecretService: c.make(
          'rotateWebhookSecretService',
        ) as RotateWebhookSecretService,
        deleteWebhookEndpointService: c.make(
          'deleteWebhookEndpointService',
        ) as DeleteWebhookEndpointService,
        testWebhookEndpointService: c.make(
          'testWebhookEndpointService',
        ) as TestWebhookEndpointService,
      })
    })

    container.bind('getAlertHistoryService', (c: IContainer) => {
      return new GetAlertHistoryService({
        eventRepo: c.make('alertEventRepository') as IAlertEventRepository,
        deliveryRepo: c.make('alertDeliveryRepository') as IAlertDeliveryRepository,
      })
    })

    container.bind('resendDeliveryService', (c: IContainer) => {
      return new ResendDeliveryService({
        deliveryRepo: c.make('alertDeliveryRepository') as IAlertDeliveryRepository,
        eventRepo: c.make('alertEventRepository') as IAlertEventRepository,
        recipientResolver: c.make('alertRecipientResolver') as IAlertRecipientResolver,
        notifierRegistry: {
          email: c.make('emailAlertNotifier') as IAlertNotifier,
          webhook: c.make('webhookAlertNotifier') as IAlertNotifier,
        },
      })
    })

    container.bind('alertHistoryController', (c: IContainer) => {
      return new AlertHistoryController({
        getAlertHistoryService: c.make('getAlertHistoryService') as GetAlertHistoryService,
        resendDeliveryService: c.make('resendDeliveryService') as ResendDeliveryService,
      })
    })

    container.bind('sendAlertService', (c: IContainer) => {
      return new SendAlertService({
        recipientResolver: c.make('alertRecipientResolver') as IAlertRecipientResolver,
        alertEventRepo: c.make('alertEventRepository') as IAlertEventRepository,
        notifiers: [
          c.make('emailAlertNotifier') as IAlertNotifier,
          c.make('webhookAlertNotifier') as IAlertNotifier,
        ],
      })
    })

    container.bind('evaluateThresholdsService', (c: IContainer) => {
      return new EvaluateThresholdsService({
        configRepo: c.make('alertConfigRepository') as IAlertConfigRepository,
        usageRepo: c.make('drizzleUsageRepository') as IUsageRepository,
        apiKeyRepo: c.make('apiKeyRepository') as IApiKeyRepository,
        sendAlertService: c.make('sendAlertService') as SendAlertService,
      })
    })
  }

  override boot(context: unknown): void {
    const core = context as PlanetCore
    const evaluateThresholdsService = core.container.make(
      'evaluateThresholdsService',
    ) as EvaluateThresholdsService

    DomainEventDispatcher.getInstance().on('bifrost.sync.completed', async (event) => {
      const orgIds = Array.isArray(event.data.orgIds)
        ? event.data.orgIds.map((value) => String(value))
        : []
      await evaluateThresholdsService.evaluateOrgs(orgIds)
    })

    console.error('[Alerts] Module loaded')
  }
}
