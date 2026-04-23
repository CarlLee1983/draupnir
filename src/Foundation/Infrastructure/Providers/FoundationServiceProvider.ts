import {
  BifrostClient,
  type BifrostClientConfig,
  createBifrostClientConfig,
} from '@draupnir/bifrost-sdk'
import { registerDocsWithGravito } from '@/Shared/Infrastructure/Framework/GravitoDocsAdapter'
import {
  adaptGravitoContainer,
  type IRouteRegistrar,
} from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import type { IQueue } from '../Ports/Queue/IQueue'
import type { IQueueRegistrar } from '../Ports/Queue/IQueueRegistrar'
import type { IScheduler } from '../Ports/Scheduler/IScheduler'
import { BifrostGatewayAdapter } from '../Services/LLMGateway/implementations/BifrostGatewayAdapter'
import { ConsoleMailer } from '../Services/Mail/ConsoleMailer'
import { UpyoMailer } from '../Services/Mail/UpyoMailer'
import { RedisStreamQueueAdapter } from '../Services/Queue/RedisStreamQueueAdapter'
import { CronerScheduler } from '../Services/Scheduler/CronerScheduler'
import { QueuedWebhookDispatcher } from '../Services/Webhook/QueuedWebhookDispatcher'
import { WebhookDispatcher } from '../Services/Webhook/WebhookDispatcher'
import { WebhookSecret } from '../Services/Webhook/WebhookSecret'

export class FoundationServiceProvider
  extends ModuleServiceProvider
  implements IRouteRegistrar, IQueueRegistrar
{
  private container?: IContainer

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('bifrostConfig', () => {
      return createBifrostClientConfig()
    })
    container.singleton('bifrostClient', (c: IContainer) => {
      const config = c.make('bifrostConfig') as BifrostClientConfig
      return new BifrostClient(config)
    })
    container.singleton('llmGatewayClient', (c: IContainer) => {
      const bifrost = c.make('bifrostClient') as BifrostClient
      return new BifrostGatewayAdapter(bifrost)
    })

    container.singleton('mailer', () => {
      const transport = process.env.EMAIL_TRANSPORT ?? 'console'
      if (transport === 'smtp') {
        const smtpUrl = process.env.SMTP_URL ?? 'smtp://localhost:1025'
        return new UpyoMailer(smtpUrl)
      }

      return new ConsoleMailer()
    })

    container.singleton('webhookDispatcher', (c: IContainer) => {
      const queue = c.make('queue') as IQueue
      return new QueuedWebhookDispatcher(queue)
    })

    container.singleton('webhookExecutor', () => {
      return new WebhookDispatcher(3)
    })

    container.singleton('scheduler', (): IScheduler => {
      return new CronerScheduler()
    })

    container.singleton('queue', (c: IContainer): IQueue => {
      const redis = c.make('redis') as IRedisService
      return new RedisStreamQueueAdapter(redis)
    })
  }

  async registerRoutes(context: IRouteContext): Promise<void> {
    context.router.get(
      '/api',
      async (ctx) => ctx.json({ success: true, message: 'Draupnir API', version: '0.1.0' }),
      { name: 'api.root' },
    )
    await registerDocsWithGravito(context)
  }

  override boot(container: IContainer): void {
    this.container = container
    console.log('🏗️  [Foundation] Module loaded')
  }

  async registerQueueHandlers(queue: IQueue): Promise<void> {
    const container = this.container!

    // Register Webhook Dispatch Worker
    queue.process('webhook.dispatch', async (payload: any) => {
      const executor = container.make('webhookExecutor') as WebhookDispatcher
      const secret = WebhookSecret.fromExisting(payload.secretData.value || payload.secretData)
      const result = await executor.dispatch({
        url: payload.url,
        eventType: payload.eventType,
        payload: payload.payload,
        secret: secret,
      })
      if (!result.success) {
        throw new Error(
          `Webhook dispatch failed after ${result.attempts} attempts: ${result.error ?? 'delivery failure'}`,
        )
      }
    })

    console.log('👷 [Foundation] Queue handlers registered')
  }
}
