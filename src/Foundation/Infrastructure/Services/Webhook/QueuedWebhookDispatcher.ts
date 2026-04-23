import type {
  IWebhookDispatcher,
  WebhookDispatchRequest,
  WebhookDispatchResult,
} from '../../Ports/IWebhookDispatcher'
import type { IQueue } from '../../Ports/Queue/IQueue'

/**
 * Decorator/Proxy for WebhookDispatcher that pushes dispatches to a background queue.
 */
export class QueuedWebhookDispatcher implements IWebhookDispatcher {
  constructor(
    private readonly queue: IQueue,
    private readonly taskName = 'webhook.dispatch',
  ) {}

  async dispatch(request: WebhookDispatchRequest): Promise<WebhookDispatchResult> {
    // Generate an ID early
    const webhookId = crypto.randomUUID()

    // Push to queue
    await this.queue.push(
      this.taskName,
      {
        ...request,
        // Use getValue() to get the raw string for serialization
        secretData: request.secret.getValue(),
        webhookId,
      },
      {
        jobName: `Webhook to ${request.url}`,
      },
    )

    return {
      success: true,
      enqueued: true,
      attempts: 0,
      webhookId,
    }
  }
}
