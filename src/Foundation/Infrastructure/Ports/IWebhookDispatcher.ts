import type { WebhookSecret } from '../Services/Webhook/WebhookSecret'

export interface WebhookDispatchRequest {
  readonly url: string
  readonly secret: WebhookSecret
  readonly eventType: string
  readonly payload: Record<string, unknown>
}

export interface WebhookDispatchResult {
  readonly success: boolean
  readonly statusCode?: number
  readonly error?: string
  readonly attempts: number
  readonly webhookId: string
}

export interface IWebhookDispatcher {
  dispatch(request: WebhookDispatchRequest): Promise<WebhookDispatchResult>
}
