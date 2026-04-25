import {
  BifrostClient,
  type BifrostClientConfig,
  createBifrostClientConfig,
} from '@draupnir/bifrost-sdk'
import { registerDocsWithGravito } from '@/Shared/Infrastructure/Framework/GravitoDocsAdapter'
import { GravitoRedisAdapter } from '@/Shared/Infrastructure/Framework/GravitoRedisAdapter'
import { AtlasActivityLogRepository } from '@/Shared/Infrastructure/Persistence/AtlasActivityLogRepository'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import type { IQueue } from '../Ports/Queue/IQueue'
import type { IQueueRegistrar } from '../Ports/Queue/IQueueRegistrar'
import type { IScheduler } from '../Ports/Scheduler/IScheduler'
import { BifrostGatewayAdapter } from '../Services/LLMGateway/implementations/BifrostGatewayAdapter'
import { OrbitSignal, SmtpTransport, LogTransport } from '@gravito/signal'
import { SignalMailer } from '../Services/Mail/SignalMailer'
import { RedisStreamQueueAdapter } from '../Services/Queue/RedisStreamQueueAdapter'
import { CronerScheduler } from '../Services/Scheduler/CronerScheduler'
import { QueuedWebhookDispatcher } from '../Services/Webhook/QueuedWebhookDispatcher'
import { WebhookDispatcher } from '../Services/Webhook/WebhookDispatcher'
import { WebhookSecret } from '../Services/Webhook/WebhookSecret'

type QueueWebhookPayload = {
  readonly secretData: { value?: string } | string
  readonly url: string
  readonly eventType: string
  readonly payload: Record<string, unknown>
}

/**
 * Service provider for foundation-level infrastructure services.
 *
 * @remarks
 * Registers core services like the LLM gateway client, mailers, webhook dispatchers,
 * schedulers, and queues. This provider also handles the registration of
 * the webhook dispatch worker.
 */
export class FoundationServiceProvider
  extends ModuleServiceProvider
  implements IRouteRegistrar, IQueueRegistrar
{
  private container?: IContainer

  protected override registerRepositories(container: IContainer): void {
    container.singleton('activityLogRepository', () => {
      return new AtlasActivityLogRepository(getCurrentDatabaseAccess())
    })
  }

  /**
   * Registers infrastructure services into the container.
   *
   * @param container - The application service container
   */
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
      const transportName = process.env.EMAIL_TRANSPORT ?? 'console'
      const fromName = process.env.EMAIL_FROM_NAME ?? 'Draupnir'
      const fromAddress = process.env.EMAIL_FROM ?? 'noreply@draupnir.local'

      let transport: any
      if (transportName === 'smtp') {
        const smtpUrl = process.env.SMTP_URL ?? 'smtp://localhost:1025'
        const url = new URL(smtpUrl)
        const secure = url.protocol === 'smtps:' || url.port === '465'
        
        transport = new SmtpTransport({
          host: url.hostname,
          port: url.port ? Number(url.port) : (secure ? 465 : 587),
          secure,
          auth: url.username ? {
            user: decodeURIComponent(url.username),
            pass: decodeURIComponent(url.password),
          } : undefined
        })
      } else {
        transport = new LogTransport()
      }

      const orbit = new OrbitSignal({
        transport,
        from: { name: fromName, address: fromAddress },
        devMode: process.env.NODE_ENV === 'development',
      })

      return new SignalMailer(orbit)
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
      const redis = new GravitoRedisAdapter(c.make('redis'))
      return new RedisStreamQueueAdapter(redis)
    })
  }

  /**
   * Registers HTTP routes for the foundation module.
   *
   * @param context - The route registration context
   */
  async registerRoutes(context: IRouteContext): Promise<void> {
    context.router.get(
      '/api',
      async (ctx) => ctx.json({ success: true, message: 'Draupnir API', version: '0.1.0' }),
      { name: 'api.root' },
    )
    await registerDocsWithGravito(context)
  }

  /**
   * Boots the service provider.
   *
   * @param container - The application service container
   */
  override boot(container: IContainer): void {
    this.container = container
    console.log('🏗️  [Foundation] Module loaded')
  }

  /**
   * Registers queue handlers for foundation tasks.
   *
   * @param queue - The queue service
   * @throws Error if the provider has not been booted
   */
  async registerQueueHandlers(queue: IQueue): Promise<void> {
    const container = this.container
    if (!container) {
      throw new Error('FoundationServiceProvider.boot() must run before registerQueueHandlers().')
    }

    // Register Webhook Dispatch Worker
    queue.process('webhook.dispatch', async (payload: unknown) => {
      const p = payload as QueueWebhookPayload
      const executor = container.make('webhookExecutor') as WebhookDispatcher
      const secretValue =
        typeof p.secretData === 'string' ? p.secretData : (p.secretData.value ?? '')
      const secret = WebhookSecret.fromExisting(secretValue)
      const result = await executor.dispatch({
        url: p.url,
        eventType: p.eventType,
        payload: p.payload,
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
