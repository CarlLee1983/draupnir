import {
  BifrostClient,
  type BifrostClientConfig,
  createBifrostClientConfig,
} from '@draupnir/bifrost-sdk'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { registerDocsWithGravito } from '@/Shared/Infrastructure/Framework/GravitoDocsAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import type { IScheduler } from '../Ports/Scheduler/IScheduler'
import { BifrostGatewayAdapter } from '../Services/LLMGateway/implementations/BifrostGatewayAdapter'
import { ConsoleMailer } from '../Services/Mail/ConsoleMailer'
import { UpyoMailer } from '../Services/Mail/UpyoMailer'
import { CronerScheduler } from '../Services/Scheduler/CronerScheduler'
import { WebhookDispatcher } from '../Services/Webhook/WebhookDispatcher'

export class FoundationServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  override register(container: IContainer): void {
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

    container.singleton('webhookDispatcher', () => {
      return new WebhookDispatcher(3)
    })

    container.singleton('scheduler', (): IScheduler => {
      return new CronerScheduler()
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

  override boot(_context: any): void {
    console.log('🏗️  [Foundation] Module loaded')
  }
}
