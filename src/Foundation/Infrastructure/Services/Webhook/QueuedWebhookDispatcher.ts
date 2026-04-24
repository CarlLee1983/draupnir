import type {
  IWebhookDispatcher,
  WebhookDispatchRequest,
  WebhookDispatchResult,
} from '../../Ports/IWebhookDispatcher'
import type { IQueue } from '../../Ports/Queue/IQueue'

/**
 * Decorator/Proxy for WebhookDispatcher that pushes dispatches to a background queue.
 *
 * @remarks
 * This implementation allows for asynchronous, reliable webhook delivery by offloading
 * the actual HTTP request to a background worker.
 */
export class QueuedWebhookDispatcher implements IWebhookDispatcher {
  /**
   * Initializes the queued dispatcher.
   *
   * @param queue - The queue service used for background processing
   * @param taskName - The name of the queue task (defaults to 'webhook.dispatch')
   */
  constructor(
    private readonly queue: IQueue,
    private readonly taskName = 'webhook.dispatch',
  ) {}

  /**
   * Enqueues a webhook dispatch request.
   *
   * @param request - The webhook dispatch parameters
   * @returns A result indicating that the request has been enqueued
   */
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
