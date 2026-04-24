import type {
  IWebhookDispatcher,
  WebhookDispatchRequest,
  WebhookDispatchResult,
} from '../../Ports/IWebhookDispatcher'

/**
 * Synchronous HTTP webhook dispatcher with retry logic.
 *
 * @remarks
 * This implementation performs the actual HTTP POST request to the target URL.
 * It supports signing the payload with a secret and automatically retrying failures
 * with exponential backoff.
 */
export class WebhookDispatcher implements IWebhookDispatcher {
  private readonly baseDelayMs = 100

  /**
   * Initializes the dispatcher.
   *
   * @param maxRetries - Maximum number of attempts for a single dispatch (defaults to 3)
   */
  constructor(private readonly maxRetries = 3) {}

  /**
   * Dispatches a webhook request to the target URL.
   *
   * @param request - The webhook dispatch parameters
   * @returns The result of the dispatch attempt, including status code or error
   */
  async dispatch(request: WebhookDispatchRequest): Promise<WebhookDispatchResult> {
    const webhookId = crypto.randomUUID()
    const webhookPayload = {
      id: webhookId,
      event: request.eventType,
      data: request.payload,
      timestamp: new Date().toISOString(),
    }

    const body = JSON.stringify(webhookPayload)
    const signature = await request.secret.sign(body)

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(request.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': request.eventType,
            'X-Webhook-Id': webhookId,
          },
          body,
        })

        if (response.ok) {
          return {
            success: true,
            statusCode: response.status,
            attempts: attempt,
            webhookId,
          }
        }

        if (attempt < this.maxRetries) {
          await this.delay(attempt)
        } else {
          return {
            success: false,
            statusCode: response.status,
            error: `Webhook dispatch failed, HTTP ${response.status}, retried ${this.maxRetries} times`,
            attempts: attempt,
            webhookId,
          }
        }
      } catch (error: unknown) {
        if (attempt < this.maxRetries) {
          await this.delay(attempt)
        } else {
          const message = error instanceof Error ? error.message : 'Unknown error'
          return {
            success: false,
            error: `Webhook dispatch failed: ${message}, retried ${this.maxRetries} times`,
            attempts: attempt,
            webhookId,
          }
        }
      }
    }

    return {
      success: false,
      error: 'Exceeded maximum retry attempts',
      attempts: this.maxRetries,
      webhookId,
    }
  }

  /**
   * Internal delay function for exponential backoff.
   *
   * @param attempt - The current attempt number
   */
  private delay(attempt: number): Promise<void> {
    const ms = this.baseDelayMs * 2 ** (attempt - 1)
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
